const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Account = require('../models/Account');
const NotificationSettings = require('../models/NotificationSettings');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/emailService');
const AppError = require('../utils/appError');

const router = express.Router();

const MAX_PIN_ATTEMPTS = 3;
const PIN_LOCKOUT_TIME_MINUTES = 15;

const logActivity = async (userId, activityType, details = {}) => {
    try {
        await ActivityLog.create({
            user: userId,
            activityType,
            details: { ...details, ipAddress: '127.0.0.1' },
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

const createInAppNotification = async (userId, title, message, type) => {
    try {
        await Notification.create({
            user: userId,
            title,
            message,
            notificationType: type,
        });
    } catch (error) {
        console.error('Error creating in-app notification:', error);
    }
};

const sendLowBalanceAlert = async (user, account) => {
    try {
        const settings = await NotificationSettings.findOne({ user: user._id });
        if (settings && !settings.lowBalanceAlert.enabled) return;
        
        const threshold = settings?.lowBalanceAlert?.threshold || 1000;
        const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));

        if (user.lastLowBalanceAlertSent && user.lastLowBalanceAlertSent > twentyFourHoursAgo) return;

        if (account.balance < threshold) {
            const emailMessage = `<h2>Low Balance Alert!</h2><p>Dear ${user.fullName},</p><p>Your account balance for ${account.accountType} (No: ${account.accountNumber}) has dropped below your threshold of <strong>₹${threshold.toFixed(2)}</strong>.</p><p>Your current balance is: <strong>₹${account.balance.toFixed(2)}</strong></p><p>Please consider adding funds to your account.</p><p>Thank you for banking with us!</p>`;
            await sendEmail({ email: user.email, subject: 'Low Balance Alert - Your Banking App', message: emailMessage, });
            user.lastLowBalanceAlertSent = new Date();
            await user.save({ validateBeforeSave: false });

            await createInAppNotification(user._id, 'Low Balance Alert', `Your balance for ${account.accountType} (No: ${account.accountNumber}) is now ₹${account.balance.toFixed(2)}, which is below your threshold of ₹${threshold.toFixed(2)}.`, 'low-balance');
        }
    } catch (error) {
        console.error('Error sending low balance alert:', error);
    }
};

const sendIncorrectPinAlert = async (user, failedAttempts) => {
    try {
        const settings = await NotificationSettings.findOne({ user: user._id });
        if (settings && !settings.incorrectPinAttemptAlert.enabled) return;
        const emailMessage = `<h2>Security Alert: Incorrect Transaction PIN Attempt</h2><p>Dear ${user.fullName},</p><p>There was an attempt to authorize a transaction with an incorrect PIN.</p><p>This is failed attempt <strong>${failedAttempts} of ${MAX_PIN_ATTEMPTS}</strong>.</p><p>If you reach ${MAX_PIN_ATTEMPTS} failed attempts, your transaction PIN will be locked for ${PIN_LOCKOUT_TIME_MINUTES} minutes.</p><p>If this was not you, please contact support immediately.</p>`;
        await sendEmail({ email: user.email, subject: 'Security Alert: Incorrect Transaction PIN Entered', message: emailMessage, });
    } catch (error) {
        console.error('Error sending incorrect PIN alert:', error);
    }
};

const verifyTransactionPin = async (req, res, next) => {
    const { transactionPin } = req.body;
    if (!transactionPin) {
        return res.status(400).json({ message: 'Transaction PIN is required.' });
    }

    try {
        const user = await User.findById(req.user._id).select('+transactionPin +failedPinAttempts +pinLockUntil fullName email');
        if (!user) { return res.status(404).json({ message: 'User not found.' }); }
        if (!user.transactionPin) { return res.status(400).json({ message: 'Transaction PIN is not set. Please set it in your profile.' }); }
        if (user.pinLockUntil && user.pinLockUntil > Date.now()) {
            const remainingTime = Math.ceil((user.pinLockUntil - Date.now()) / (1000 * 60));
            return res.status(403).json({ message: `Transaction PIN is locked due to too many failed attempts. Please try again in ${remainingTime} minutes.`, pinLocked: true, });
        }
        const isPinMatch = await user.matchTransactionPin(transactionPin);
        if (isPinMatch) {
            user.failedPinAttempts = 0; user.pinLockUntil = undefined;
            await user.save({ validateBeforeSave: false });
            req.user = user;
            next();
        } else {
            user.failedPinAttempts += 1;
            if (user.failedPinAttempts >= MAX_PIN_ATTEMPTS) {
                user.pinLockUntil = new Date(Date.now() + PIN_LOCKOUT_TIME_MINUTES * 60 * 1000);
                await user.save({ validateBeforeSave: false });
                const emailMessage = `<h2>Security Alert: Transaction PIN Locked!</h2><p>Dear ${user.fullName},</p><p>Your transaction PIN has been locked due to ${MAX_PIN_ATTEMPTS} incorrect attempts.</p><p>You will be able to try again in ${PIN_LOCKOUT_TIME_MINUTES} minutes.</p><p>If you did not attempt this, please contact support immediately.</p>`;
                await sendEmail({ email: user.email, subject: 'Security Alert: Transaction PIN Locked', message: emailMessage, });
                await createInAppNotification(user._id, 'PIN Locked', `Your transaction PIN is locked for ${PIN_LOCKOUT_TIME_MINUTES} minutes due to incorrect attempts.`, 'pin-locked');
                return res.status(401).json({ message: `Incorrect Transaction PIN. Your PIN is now locked for ${PIN_LOCKOUT_TIME_MINUTES} minutes due to too many failed attempts.`, pinLocked: true, });
            } else {
                await user.save({ validateBeforeSave: false });
                await sendIncorrectPinAlert(user, user.failedPinAttempts);
                return res.status(401).json({ message: `Incorrect Transaction PIN. You have ${MAX_PIN_ATTEMPTS - user.failedPinAttempts} attempts remaining.`, pinLocked: false, });
            }
        }
    } catch (error) {
        console.error('Error during PIN verification:', error);
        res.status(500).json({ message: 'Server error during PIN verification.' });
    }
};


// @desc    Get current user's balance and latest transactions
// @route   GET /api/transactions/dashboard
// @access  Private
router.get('/dashboard', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('fullName email').lean();
        if (!user) { throw new AppError('User not found.', 404); }
        
        const accounts = await Account.find({ user: req.user._id }).lean();
        if (accounts.length === 0) {
            return res.status(404).json({ message: 'No accounts found for this user.' });
        }
        
        const accountNumbers = accounts.map(acc => acc.accountNumber);
        
        const transactions = await Transaction.find({
            user: req.user._id,
            account: { $in: accounts.map(acc => acc._id) }
        }).sort({ createdAt: -1 }).limit(10).lean().populate('account', 'accountNumber accountType');

        res.json({ accounts, transactions });
    } catch (error) { next(error); }
});

// @desc    Get a user's transaction categories
// @route   GET /api/transactions/categories
// @access  Private
router.get('/categories', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('categories').lean();
        if (!user) { throw new AppError('User not found.', 404); }
        res.json(user.categories);
    } catch (error) { next(error); }
});

// @desc    Add a new category for a user
// @route   POST /api/transactions/categories
// @access  Private
router.post('/categories', protect, async (req, res, next) => {
    const { newCategory } = req.body;
    if (!newCategory || typeof newCategory !== 'string' || newCategory.trim().length === 0) { throw new AppError('Please provide a valid category name.', 400); }
    try {
        const user = await User.findById(req.user._id);
        if (!user) { throw new AppError('User not found.', 404); }
        const categoryName = newCategory.trim();
        if (user.categories.some(cat => cat.toLowerCase() === categoryName.toLowerCase())) { throw new AppError('This category already exists.', 400); }
        user.categories.push(categoryName);
        await user.save();
        res.status(201).json({ message: 'Category added successfully!', categories: user.categories });
    }
    catch (error) { next(error); }
});


// @desc    Deposit funds into user's account
// @route   POST /api/transactions/deposit
// @access  Private
router.post('/deposit', protect, verifyTransactionPin, async (req, res, next) => {
    const { amount, accountNumber } = req.body;
    if (amount <= 0 || isNaN(amount)) { throw new AppError('Amount must be a positive number.', 400); }
    if (!accountNumber) { throw new AppError('Account number is required.', 400); }
    
    try {
        const user = await User.findById(req.user._id).select('fullName email lowBalanceThreshold lastLowBalanceAlertSent');
        const account = await Account.findOne({ user: user._id, accountNumber });
        if (!account) { throw new AppError('Account not found or does not belong to user.', 404); }

        const updatedAccount = await Account.findByIdAndUpdate(
            account._id,
            { $inc: { balance: parseFloat(amount) } },
            { new: true, runValidators: true }
        ).lean();

        if (!updatedAccount) { throw new AppError('Failed to update account balance.', 500); }
        
        const transaction = await Transaction.create({
            user: req.user._id, account: updatedAccount._id, type: 'deposit', amount: parseFloat(amount), description: `Deposit of ₹${parseFloat(amount).toFixed(2)}`, category: 'Deposit',
        });
        
        const settings = await NotificationSettings.findOne({ user: user._id });
        if (settings && settings.transactionConfirmations.enabled) {
            const emailMessage = `<h2>Deposit Confirmation</h2><p>Dear ${user.fullName},</p><p>A deposit of <strong>₹${parseFloat(amount).toFixed(2)}</strong> has been successfully credited to your ${updatedAccount.accountType} account (No: ${updatedAccount.accountNumber}).</p><p>Your new balance is: <strong>₹${updatedAccount.balance.toFixed(2)}</strong></p><p>Transaction ID: ${transaction._id}</p><p>Thank you for banking with us!</p>`;
            await sendEmail({ email: user.email, subject: 'Deposit Confirmation - Your Banking App', message: emailMessage, });
        }
        
        if (updatedAccount.balance >= user.lowBalanceThreshold && user.lastLowBalanceAlertSent !== null) {
            user.lastLowBalanceAlertSent = null;
            await user.save({ validateBeforeSave: false });
        }
        await sendLowBalanceAlert(user, updatedAccount);
        
        await logActivity(req.user._id, 'deposit', { amount: parseFloat(amount), transactionId: transaction._id, accountNumber: updatedAccount.accountNumber });
        await createInAppNotification(user._id, 'Deposit Received', `A deposit of ₹${parseFloat(amount).toFixed(2)} has been credited to your ${updatedAccount.accountType} account.`, 'transaction-confirmation');
        
        res.status(200).json({ message: 'Deposit successful!', newBalance: updatedAccount.balance, transaction, });
    } catch (error) { next(error); }
});

// @desc    Withdraw funds from user's account
// @route   POST /api/transactions/withdraw
// @access  Private
router.post('/withdraw', protect, verifyTransactionPin, async (req, res, next) => {
    const { amount, category, accountNumber } = req.body;
    if (amount <= 0 || isNaN(amount)) { throw new AppError('Amount must be a positive number.', 400); }
    if (!accountNumber) { throw new AppError('Account number is required.', 400); }
    if (!category || category.trim() === '') { throw new AppError('Transaction category is required.', 400); }

    try {
        const user = await User.findById(req.user._id).select('fullName email lowBalanceThreshold lastLowBalanceAlertSent');
        const account = await Account.findOne({ user: user._id, accountNumber });
        if (!account) { throw new AppError('Account not found or does not belong to user.', 404); }
        
        const MIN_SAVINGS_BALANCE = 500;
        if (account.accountType === 'Savings' && account.balance - parseFloat(amount) < MIN_SAVINGS_BALANCE) {
            throw new AppError(`Cannot withdraw from a Savings account if the balance drops below ₹${MIN_SAVINGS_BALANCE}.`, 400);
        }

        if (account.balance < parseFloat(amount)) {
            throw new AppError('Insufficient funds.', 400);
        }

        const updatedAccount = await Account.findByIdAndUpdate(
            account._id,
            { $inc: { balance: -parseFloat(amount) } },
            { new: true, runValidators: true }
        ).lean();

        const transaction = await Transaction.create({
            user: req.user._id, account: updatedAccount._id, type: 'withdrawal', amount: parseFloat(amount), description: `Withdrawal of ₹${parseFloat(amount).toFixed(2)}`, category: category,
        });

        const settings = await NotificationSettings.findOne({ user: user._id });
        if (settings && settings.transactionConfirmations.enabled) {
            const emailMessage = `<h2>Withdrawal Confirmation</h2><p>Dear ${user.fullName},</p><p>A withdrawal of <strong>₹${parseFloat(amount).toFixed(2)}</strong> from your ${updatedAccount.accountType} account (No: ${updatedAccount.accountNumber}) for '${category}'.</p><p>Your new balance is: <strong>₹${updatedAccount.balance.toFixed(2)}</strong></p><p>Transaction ID: ${transaction._id}</p><p>Thank you for banking with us!</p>`;
            await sendEmail({ email: user.email, subject: 'Withdrawal Confirmation - Your Banking App', message: emailMessage, });
        }
        await sendLowBalanceAlert(user, updatedAccount);
        
        await logActivity(req.user._id, 'withdrawal', { amount: parseFloat(amount), category, transactionId: transaction._id, accountNumber: updatedAccount.accountNumber });
        await createInAppNotification(user._id, 'Withdrawal Processed', `A withdrawal of ₹${parseFloat(amount).toFixed(2)} was processed from your ${updatedAccount.accountType} account.`, 'transaction-confirmation');
        
        res.status(200).json({ message: 'Withdrawal successful!', newBalance: updatedAccount.balance, transaction, });
    } catch (error) { next(error); }
});

// @desc    Transfer funds from one user to another
// @route   POST /api/transactions/transfer
// @access  Private
router.post('/transfer', protect, verifyTransactionPin, async (req, res, next) => {
    const { recipientMobileOrEmail, amount, category, accountNumber } = req.body;
    if (amount <= 0 || isNaN(amount)) { throw new AppError('Transfer amount must be a positive number.', 400); }
    if (!accountNumber) { throw new AppError('Source account number is required.', 400); }
    if (!recipientMobileOrEmail) { throw new AppError('Recipient mobile number or email is required.', 400); }
    if (!category || category.trim() === '') { throw new AppError('Transaction category is required.', 400); }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const sender = await User.findById(req.user._id).session(session);
        if (!sender) { throw new AppError('Sender not found.', 404); }
        
        const senderAccount = await Account.findOne({ user: req.user._id, accountNumber }).session(session);
        if (!senderAccount) { throw new AppError('Source account not found or does not belong to user.', 404); }

        const MIN_SAVINGS_BALANCE = 500;
        if (senderAccount.accountType === 'Savings' && senderAccount.balance - parseFloat(amount) < MIN_SAVINGS_BALANCE) {
            throw new AppError(`Cannot transfer from a Savings account if the balance drops below ₹${MIN_SAVINGS_BALANCE}.`, 400);
        }

        if (senderAccount.balance < parseFloat(amount)) {
            throw new AppError('Insufficient funds.', 400);
        }

        const recipient = await User.findOne({ $or: [{ mobileNumber: recipientMobileOrEmail }, { email: recipientMobileOrEmail }] }).session(session);
        if (!recipient) { throw new AppError('Recipient not found with provided mobile number or email.', 400); }
        if (sender._id.toString() === recipient._id.toString()) { throw new AppError('Cannot transfer funds to yourself.', 400); }

        const updatedSenderAccount = await Account.findByIdAndUpdate(senderAccount._id, { $inc: { balance: -parseFloat(amount) } }, { new: true, runValidators: true, session: session }).lean();
        if (!updatedSenderAccount) { throw new AppError('Failed to update sender account balance.', 500); }
        
        const recipientAccount = await Account.findOne({ user: recipient._id, accountNumber: recipientMobileOrEmail }).session(session);
        if (!recipientAccount) { throw new AppError('Recipient account not found.', 404); }

        const updatedRecipientAccount = await Account.findByIdAndUpdate(recipientAccount._id, { $inc: { balance: parseFloat(amount) } }, { new: true, runValidators: true, session: session }).lean();
        if (!updatedRecipientAccount) { throw new AppError('Failed to update recipient account balance.', 500); }
        
        const senderTransaction = await Transaction.create([{
            user: sender._id, account: updatedSenderAccount._id, type: 'transferOut', amount: parseFloat(amount), description: `Transfer to ${recipient.fullName} (${recipientMobileOrEmail})`,
            recipient: recipient._id, recipientAccount: recipientMobileOrEmail, category: category,
        }], { session });

        const recipientTransaction = await Transaction.create([{
            user: recipient._id, account: updatedRecipientAccount._id, type: 'transferIn', amount: parseFloat(amount), description: `Transfer from ${sender.fullName} (${sender.mobileNumber || sender.email})`,
            recipient: sender._id, recipientAccount: sender.mobileNumber || sender.email, category: 'Incoming Transfer',
        }], { session });

        await session.commitTransaction();
        session.endSession();

        const senderSettings = await NotificationSettings.findOne({ user: updatedSenderAccount.user });
        if (senderSettings && senderSettings.transactionConfirmations.enabled) {
            const senderEmailMessage = `<h2>Fund Transfer Confirmation (Outgoing)</h2><p>Dear ${sender.fullName},</p><p>You have successfully transferred <strong>₹${parseFloat(amount).toFixed(2)}</strong> from your ${updatedSenderAccount.accountType} account (No: ${updatedSenderAccount.accountNumber}) to ${recipient.fullName} (${recipientMobileOrEmail}).</p><p>Your new balance is: <strong>₹${updatedSenderAccount.balance.toFixed(2)}</strong></p><p>Transaction ID: ${senderTransaction[0]._id}</p><p>Thank you for banking with us!</p>`;
            await sendEmail({ email: sender.email, subject: 'Transfer Confirmation - Funds Sent', message: senderEmailMessage, });
        }
        const recipientSettings = await NotificationSettings.findOne({ user: updatedRecipientAccount.user });
        if (recipientSettings && recipientSettings.transactionConfirmations.enabled) {
            const recipientEmailMessage = `<h2>Fund Transfer Confirmation (Incoming)</h2><p>Dear ${recipient.fullName},</p><p>You have received a transfer of <strong>₹${parseFloat(amount).toFixed(2)}</strong> from ${sender.fullName} (${sender.mobileNumber || sender.email}).</p><p>Your new balance is: <strong>₹${updatedRecipientAccount.balance.toFixed(2)}</strong></p><p>Transaction ID: ${recipientTransaction[0]._id}</p><p>Thank you for banking with us!</p>`;
            await sendEmail({ email: recipient.email, subject: 'Transfer Confirmation - Funds Received', message: recipientEmailMessage, });
        }
        await sendLowBalanceAlert(sender, updatedSenderAccount);
        
        await logActivity(req.user._id, 'transfer-out', { amount: parseFloat(amount), recipient: recipient._id, category, transactionId: senderTransaction[0]._id, fromAccount: updatedSenderAccount.accountNumber });
        await createInAppNotification(req.user._id, 'Funds Sent', `You sent ₹${parseFloat(amount).toFixed(2)} to ${recipient.fullName} from your ${updatedSenderAccount.accountType} account.`, 'transaction-confirmation');
        await createInAppNotification(recipient._id, 'Funds Received', `You received ₹${parseFloat(amount).toFixed(2)} from ${sender.fullName} to your ${updatedRecipientAccount.accountType} account.`, 'transaction-confirmation');
        
        res.status(200).json({ message: 'Transfer successful!', newSenderBalance: updatedSenderAccount.balance, });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
});

// @desc    Get all transaction history for the authenticated user
// @route   GET /api/transactions/history
// @access  Private
router.get('/history', protect, async (req, res, next) => {
    const { accountNumber } = req.query;

    try {
        let matchQuery = { user: req.user._id };

        if (accountNumber) {
            const account = await Account.findOne({ user: req.user._id, accountNumber }).lean();
            if (account) {
                matchQuery.account = account._id;
            } else {
                throw new AppError('Account not found for this user.', 404);
            }
        }

        const transactions = await Transaction.find(matchQuery)
            .sort({ createdAt: -1 })
            .select('-recipient -recipientAccount')
            .lean()
            .populate('account', 'accountType accountNumber');
        res.json(transactions);
    } catch (error) { next(error); }
});

module.exports = router;
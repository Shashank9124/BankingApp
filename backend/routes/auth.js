const express = require('express');
const { check, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Account = require('../models/Account');
const NotificationSettings = require('../models/NotificationSettings');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/emailService');
const AppError = require('../utils/appError');

const router = express.Router();

const generateToken = (id) => {
    const expiresInValue = parseInt(process.env.JWT_EXPIRES_IN) || process.env.JWT_EXPIRES_IN || '1h';
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: expiresInValue });
};

const generateAccountNumber = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_TIME_MINUTES = 15;
const OTP_LOGIN_EXPIRY_MINUTES = 10;
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

const sendNewLoginAlert = async (user, loginType) => {
    try {
        const settings = await NotificationSettings.findOne({ user: user._id });
        if (settings && !settings.newLoginAlert.enabled) return;
        const loginTime = new Date().toLocaleString();
        const emailMessage = `<h2>New Login Alert</h2><p>Dear ${user.fullName},</p><p>Your Banking App account was just logged into successfully.</p><p><strong>Login Type:</strong> ${loginType}</p><p><strong>Time:</strong> ${loginTime}</p><p>If this was not you, please secure your account immediately by changing your password or contacting support.</p>`;
        await sendEmail({ email: user.email, subject: 'Security Alert: New Login to Your Account', message: emailMessage, });
    } catch (error) {
        console.error('Error sending new login alert:', error);
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

const sendPasswordChangeAlert = async (user) => {
    try {
        const settings = await NotificationSettings.findOne({ user: user._id });
        if (settings && !settings.passwordChangeAlert.enabled) return;
        const emailMessage = `<h2>Password Changed Successfully</h2><p>Dear ${user.fullName},</p><p>Your password for Banking App has been successfully changed.</p><p>If you did not perform this action, please contact support immediately.</p>`;
        await sendEmail({ email: user.email, subject: 'Banking App - Password Changed', message: emailMessage, });
    } catch (error) {
        console.error('Error sending password change alert:', error);
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

router.post(
    '/register',
    [
        check('fullName').not().isEmpty().withMessage('Full name is required.').trim(),
        check('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
        check('mobileNumber').isLength({ min: 10, max: 10 }).withMessage('Mobile number must be 10 digits.').isNumeric().withMessage('Mobile number must be a number.'),
        check('password').exists().not().isEmpty().withMessage('Password is required.').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.').trim(),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
            }

            const { fullName, email, mobileNumber, password } = req.body;
            let userExists = await User.findOne({ $or: [{ email }, { mobileNumber }] });
            if (userExists) {
                if (userExists.email === email) {
                    throw new AppError('User with this email already exists.', 400);
                }
                if (userExists.mobileNumber === mobileNumber) {
                    throw new AppError('User with this mobile number already exists.', 400);
                }
            }

            const existingAccount = await Account.findOne({ 'accountNumber': mobileNumber });
            if (existingAccount) {
                throw new AppError('This mobile number is already associated with an account.', 400);
            }

            const user = await User.create({
                fullName, email, mobileNumber, password, role: 'user',
            });
            if (user) {
                const defaultAccount = await Account.create({
                    user: user._id,
                    accountNumber: generateAccountNumber(),
                    accountType: "Zero Balance",
                    balance: 0,
                });
                await NotificationSettings.create({ user: user._id });
                const emailMessage = `<h2>Welcome to Banking App!</h2><p>Dear ${user.fullName},</p><p>Your account has been successfully created.</p><p>Your unique Bank Account Number is: <strong>${defaultAccount.accountNumber}</strong></p><p>You can now log in and start managing your finances.</p><p>Thank you for choosing us!</p>`;
                await sendEmail({ email: user.email, subject: 'Welcome to Banking App - Account Created!', message: emailMessage, });
                
                await logActivity(user._id, 'login', { loginType: 'registration' });
                await createInAppNotification(user._id, 'Welcome!', 'Your account has been successfully created.', 'alert');

                res.status(201).json({
                    _id: user._id, fullName: user.fullName, email: user.email, mobileNumber: user.mobileNumber,
                    accounts: [defaultAccount],
                    role: user.role, hasTransactionPin: !!user.transactionPin, token: generateToken(user._id),
                });
            } else {
                throw new AppError('Invalid user data provided.', 400);
            }
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/login',
    [
        check('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
        check('password').not().isEmpty().withMessage('Password is required.'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
            }
            const { email, password } = req.body;
            const user = await User.findOne({ email }).select('+password +transactionPin');
            if (!user) { throw new AppError('Invalid email or password.', 401); }

            if (user.lockUntil && user.lockUntil > Date.now()) {
                const remainingTime = Math.ceil((user.lockUntil - Date.now()) / (1000 * 60));
                return res.status(403).json({
                    message: `Account locked due to too many failed attempts. Please try again in ${remainingTime} minutes, or login with OTP.`,
                    locked: true,
                });
            }
            const isMatch = await user.matchPassword(password);
            if (isMatch) {
                user.failedLoginAttempts = 0; user.lockUntil = undefined;
                user.loginOtp = undefined; user.loginOtpExpires = undefined;
                await user.save({ validateBeforeSave: false });
                await sendNewLoginAlert(user, 'Password Login');
                
                await logActivity(user._id, 'login', { loginType: 'Password' });
                await createInAppNotification(user._id, 'New Login', 'Your account was logged into successfully.', 'new-login');
                
                const accounts = await Account.find({ user: user._id }).lean();
                if (accounts.length === 0) {
                    throw new AppError('No accounts found for this user.', 404);
                }

                res.json({
                    _id: user._id, fullName: user.fullName, email: user.email, mobileNumber: user.mobileNumber,
                    accounts: accounts,
                    role: user.role, hasTransactionPin: !!user.transactionPin, token: generateToken(user._id),
                });
            } else {
                user.failedLoginAttempts += 1;
                if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
                    user.lockUntil = new Date(Date.now() + LOCKOUT_TIME_MINUTES * 60 * 1000);
                    const loginOtp = Math.floor(1000 + Math.random() * 9000).toString();
                    user.loginOtp = loginOtp;
                    user.loginOtpExpires = new Date(Date.now() + OTP_LOGIN_EXPIRY_MINUTES * 60 * 1000);
                    await user.save({ validateBeforeSave: false });
                    const emailMessage = `<h2>Security Alert: Too Many Failed Login Attempts</h2><p>Dear ${user.fullName},</p><p>There have been ${user.failedLoginAttempts} failed login attempts for your Banking App account.</p><p>Your account has been temporarily locked for ${LOCKOUT_TIME_MINUTES} minutes.</p><p>To log in securely, use the following One-Time Password (OTP): <strong>${loginOtp}</strong></p><p>This OTP is valid for ${OTP_LOGIN_EXPIRY_MINUTES} minutes and can be used on the "Login with OTP" page.</p><p>If you did not attempt to log in, please secure your account immediately or contact support.</p>`;
                    await sendEmail({ email: user.email, subject: 'Security Alert: Failed Login Attempts & OTP for Login', message: emailMessage, });
                    await createInAppNotification(user._id, 'Account Locked', `Your account has been locked due to ${user.failedLoginAttempts} failed login attempts. Check your email for OTP.`, 'alert');
                    return res.status(401).json({ message: `Too many failed login attempts. Your account has been temporarily locked. Please check your email for an OTP to log in securely.`, locked: true, otpSent: true, });
                } else {
                    await user.save({ validateBeforeSave: false });
                    return res.status(401).json({ message: `Invalid email or password. You have ${MAX_LOGIN_ATTEMPTS - user.failedLoginAttempts} attempts remaining before lockout.`, });
                }
            }
        } catch (error) {
            next(error);
        }
    }
);

router.post('/logout', protect, async (req, res, next) => {
    try {
        await logActivity(req.user._id, 'logout');
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        next(error);
    }
});

router.get('/profile', protect, async (req, res, next) => {
    try {
        const userProfile = await User.findById(req.user._id).select('-password');
        const userWithPinStatus = await User.findById(req.user._id).select('transactionPin');
        const accounts = await Account.find({ user: req.user._id }).lean();
        if (!userProfile) { throw new AppError('User profile not found.', 404); }
        res.json({
            ...userProfile.toObject(),
            hasTransactionPin: !!userWithPinStatus.transactionPin,
            accounts: accounts,
        });
    } catch (error) { next(error); }
});

router.put(
    '/profile',
    protect,
    [
        check('fullName').not().isEmpty().withMessage('Full name cannot be empty.').trim(),
        check('mobileNumber').isLength({ min: 10, max: 10 }).withMessage('Mobile number must be 10 digits.').isNumeric().withMessage('Mobile number must be a number.'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { fullName, mobileNumber } = req.body;
            const user = await User.findById(req.user._id);
            if (!user) { throw new AppError('User not found.', 404); }
            if (fullName) user.fullName = fullName;
            if (mobileNumber) user.mobileNumber = mobileNumber;
            await user.save();

            await logActivity(user._id, 'profile-update', { updatedFields: { fullName, mobileNumber } });
            await createInAppNotification(user._id, 'Profile Updated', 'Your profile details have been successfully updated.', 'alert');
            
            const accounts = await Account.find({ user: user._id }).lean();

            res.json({
                message: 'Profile updated successfully!',
                user: {
                    _id: user._id, fullName: user.fullName, email: user.email, mobileNumber: user.mobileNumber,
                    accounts: accounts,
                    role: user.role, hasTransactionPin: !!user.transactionPin
                },
            });
        } catch (error) { next(error); }
    }
);

router.post(
    '/forgotpassword',
    [ check('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail() ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { email } = req.body;
            const user = await User.findOne({ email });
            if (!user) { return res.status(200).json({ message: 'If an account with that email exists, an OTP has been sent.' }); }
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = Date.now() + 10 * 60 * 1000;
            user.resetPasswordOtp = otp;
            user.resetPasswordOtpExpires = otpExpiry;
            await user.save({ validateBeforeSave: false });
            const emailMessage = `<h2>Password Reset Request</h2><p>Dear ${user.fullName},</p><p>You have requested a password reset for your Banking App account.</p><p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes. Do not share this with anyone.</p><p>If you did not request this, please ignore this email.</p>`;
            await sendEmail({ email: user.email, subject: 'Banking App - Password Reset OTP', message: emailMessage, });
            res.status(200).json({ message: 'OTP sent to your email successfully.' });
        } catch (error) { next(error); }
    }
);

router.put(
    '/resetpassword',
    [
        check('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
        check('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits.').isNumeric().withMessage('OTP must be a number.'),
        check('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.').trim(),
        check('confirmNewPassword').exists().custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('New passwords do not match.');
            }
            return true;
        }).withMessage('New passwords do not match.').trim(),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { email, otp, newPassword } = req.body;
            const user = await User.findOne({ email });
            if (!user) { throw new AppError('Invalid email or OTP.', 400); }
            if (user.resetPasswordOtp !== otp) { throw new AppError('Invalid OTP.', 400); }
            if (user.resetPasswordOtpExpires < Date.now()) { throw new AppError('OTP has expired. Please request a new one.', 400); }
            user.password = newPassword;
            user.resetPasswordOtp = undefined;
            user.resetPasswordOtpExpires = undefined;
            await user.save({ validateBeforeSave: false });
            const emailMessage = `<h2>Password Reset Successful</h2><p>Dear ${user.fullName},</p><p>Your password for Banking App has been successfully reset.</p><p>If you did not perform this action, please contact support immediately.</p>`;
            await sendEmail({ email: user.email, subject: 'Banking App - Password Successfully Reset', message: emailMessage, });
            
            await logActivity(user._id, 'password-reset');
            await createInAppNotification(user._id, 'Password Reset', 'Your password was successfully reset.', 'password-change');

            res.status(200).json({ message: 'Password has been reset successfully.' });
        } catch (error) { next(error); }
    }
);

router.post(
    '/login-with-otp',
    [
        check('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
        check('otp').isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits.').isNumeric().withMessage('OTP must be a number.'),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { email, otp } = req.body;
            const user = await User.findOne({ email });
            if (!user) { throw new AppError('Invalid email or OTP.', 401); }
            if (user.loginOtp !== otp) { throw new AppError('Invalid OTP.', 401); }
            if (user.loginOtpExpires < Date.now()) { throw new AppError('OTP has expired. Please request a new login attempt or forgot password.', 401); }
            user.failedLoginAttempts = 0; user.lockUntil = undefined;
            user.loginOtp = undefined; user.loginOtpExpires = undefined;
            await user.save({ validateBeforeSave: false });
            await sendNewLoginAlert(user, 'OTP Login');

            await logActivity(user._id, 'login', { loginType: 'OTP' });
            await createInAppNotification(user._id, 'New Login (OTP)', 'Your account was successfully logged into with an OTP.', 'new-login');
            
            const accounts = await Account.find({ user: user._id }).lean();

            res.json({
                _id: user._id, fullName: user.fullName, email: user.email, mobileNumber: user.mobileNumber,
                accounts: accounts,
                role: user.role, hasTransactionPin: !!user.transactionPin, token: generateToken(user._id),
            });
        } catch (error) { next(error); }
    }
);

router.put(
    '/change-password',
    protect,
    [
        check('currentPassword').not().isEmpty().withMessage('Current password is required.'),
        check('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long.'),
        check('confirmNewPassword').custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('New passwords do not match.');
            }
            return true;
        }).withMessage('New passwords do not match.').trim(),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { currentPassword, newPassword } = req.body;
            const user = await User.findById(req.user._id).select('+password');
            if (!user) { throw new AppError('User not found.', 404); }
            const isMatch = await user.matchPassword(currentPassword);
            if (!isMatch) { throw new AppError('Current password is incorrect.', 401); }
            user.password = newPassword;
            await user.save({ validateBeforeSave: false });
            await sendPasswordChangeAlert(user);

            await logActivity(user._id, 'password-change');
            await createInAppNotification(user._id, 'Password Changed', 'Your password was successfully changed.', 'password-change');

            res.status(200).json({ message: 'Password changed successfully!' });
        } catch (error) { next(error); }
    }
);

router.post(
    '/set-transaction-pin',
    protect,
    [
        check('pin').isLength({ min: 4, max: 6 }).withMessage('PIN must be 4 or 6 digits long.').isNumeric().withMessage('PIN must be a number.').trim(),
        check('confirmPin').custom((value, { req }) => {
            if (value !== req.body.pin) {
                throw new Error('PINs do not match.');
            }
            return true;
        }).withMessage('PINs do not match.').trim(),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { pin } = req.body;
            const user = await User.findById(req.user._id).select('+transactionPin');
            if (!user) { throw new AppError('User not found.', 404); }
            if (user.transactionPin) { throw new AppError('Transaction PIN is already set. Use change PIN route.', 400); }
            user.transactionPin = pin;
            user.failedPinAttempts = 0;
            user.pinLockUntil = undefined;
            await user.save({ validateBeforeSave: false });
            const emailMessage = `<h2>Transaction PIN Set Successfully!</h2><p>Dear ${user.fullName},</p><p>Your 4-digit transaction PIN has been successfully set for your Banking App account.</p><p>You will now need this PIN to authorize sensitive transactions.</p><p>If you did not set this PIN, please contact support immediately.</p>`;
            await sendEmail({ email: user.email, subject: 'Banking App - Transaction PIN Set', message: emailMessage, });

            await logActivity(user._id, 'pin-set');
            await createInAppNotification(user._id, 'Transaction PIN Set', 'Your transaction PIN has been successfully set.', 'pin-set');

            res.status(200).json({ message: 'Transaction PIN set successfully!', hasTransactionPin: true });
        } catch (error) { next(error); }
    }
);

router.put(
    '/change-transaction-pin',
    protect,
    [
        check('currentPin').isLength({ min: 4, max: 6 }).withMessage('Current PIN must be 4 or 6 digits long.').isNumeric().withMessage('Current PIN must be a number.').trim(),
        check('newPin').isLength({ min: 4, max: 6 }).withMessage('New PIN must be 4 or 6 digits long.').isNumeric().withMessage('New PIN must be a number.').trim(),
        check('confirmNewPin').custom((value, { req }) => {
            if (value !== req.body.newPin) {
                throw new Error('New PINs do not match.');
            }
            return true;
        }).withMessage('New PINs do not match.').trim(),
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) { return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') }); }

            const { currentPin, newPin } = req.body;
            const user = await User.findById(req.user._id).select('+transactionPin');
            if (!user) { throw new AppError('User not found.', 404); }
            if (!user.transactionPin) { throw new AppError('No transaction PIN is set. Use set PIN route.', 400); }
            const isMatch = await user.matchTransactionPin(currentPin);
            if (!isMatch) { throw new AppError('Current transaction PIN is incorrect.', 401); }
            user.transactionPin = newPin;
            user.failedPinAttempts = 0;
            user.pinLockUntil = undefined;
            await user.save({ validateBeforeSave: false });
            const emailMessage = `<h2>Transaction PIN Changed Successfully!</h2><p>Dear ${user.fullName},</p><p>Your transaction PIN for Banking App has been successfully changed.</p><p>If you did not change this PIN, please contact support immediately.</p>`;
            await sendEmail({ email: user.email, subject: 'Banking App - Transaction PIN Changed', message: emailMessage, });

            await logActivity(user._id, 'pin-change');
            await createInAppNotification(user._id, 'Transaction PIN Changed', 'Your transaction PIN was successfully changed.', 'pin-change');

            res.status(200).json({ message: 'Transaction PIN changed successfully!', hasTransactionPin: true });
        } catch (error) { next(error); }
    }
);

router.get('/notifications', protect, async (req, res, next) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean();
        res.json(notifications);
    } catch (error) {
        next(error);
    }
});

router.put('/notifications/read', protect, async (req, res, next) => {
    try {
        await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
        res.status(200).json({ message: 'All notifications marked as read.' });
    } catch (error) {
        next(error);
    }
});

router.get('/activity', protect, async (req, res, next) => {
    try {
        const activities = await ActivityLog.find({ user: req.user._id })
            .sort({ timestamp: -1 })
            .lean();
        res.json(activities);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
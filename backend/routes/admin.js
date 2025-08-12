const express = require('express');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { protect } = require('../middleware/auth');
const { adminProtect } = require('../middleware/adminAuth');
const AppError = require('../utils/appError');

const router = express.Router();

router.use(protect, adminProtect);

router.get('/users', async (req, res, next) => {
    try {
        const users = await User.find().select('-password').lean();
        res.json(users);
    } catch (error) {
        next(error);
    }
});

router.get('/transactions', async (req, res, next) => {
    try {
        const transactions = await Transaction.find()
            .populate('user', 'fullName email')
            .populate('account', 'accountNumber accountType')
            .populate('recipient', 'fullName email')
            .sort({ createdAt: -1 })
            .lean();
        res.json(transactions);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
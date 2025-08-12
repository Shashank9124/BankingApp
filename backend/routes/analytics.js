const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const AppError = require('../utils/appError');

const router = express.Router();

router.use(protect);

router.get('/spending', async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;
        let matchStage = {
            user: req.user._id,
            type: { $in: ['withdrawal', 'transferOut'] },
        };

        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }

        const spendingData = await Transaction.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$category',
                    totalSpending: { $sum: '$amount' },
                },
            },
            { $sort: { totalSpending: -1 } },
            {
                $project: {
                    category: '$_id',
                    totalSpending: '$totalSpending',
                    _id: 0,
                },
            }
        ]);

        res.json(spendingData);
    } catch (error) {
        next(error);
    }
});

router.get('/budgets', async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('monthlyBudgets').lean();
        if (!user) {
            throw new AppError('User not found.', 404);
        }
        
        const budgetsObject = user.monthlyBudgets ? Object.fromEntries(Object.entries(user.monthlyBudgets)) : {};
        res.json(budgetsObject);

    } catch (error) {
        next(error);
    }
});

router.put('/budgets', async (req, res, next) => {
    const newBudgets = req.body;

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new AppError('User not found.', 404);
        }

        user.monthlyBudgets = new Map(Object.entries(newBudgets));

        await user.save({ validateBeforeSave: false });

        res.json({ message: 'Budgets updated successfully!', budgets: Object.fromEntries(user.monthlyBudgets) });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
const express = require('express');
const NotificationSettings = require('../models/NotificationSettings');
const { protect } = require('../middleware/auth');
const AppError = require('../utils/appError');

const router = express.Router();

router.use(protect);

router.get('/settings', async (req, res, next) => {
    try {
        let settings = await NotificationSettings.findOne({ user: req.user._id }).lean();
        if (!settings) {
            settings = await NotificationSettings.create({ user: req.user._id });
        }
        res.json(settings);
    } catch (error) {
        next(error);
    }
});

router.put('/settings', async (req, res, next) => {
    const {
        transactionConfirmations,
        lowBalanceAlert,
        newLoginAlert,
        incorrectPinAttemptAlert,
        passwordChangeAlert,
    } = req.body;

    try {
        const settings = await NotificationSettings.findOne({ user: req.user._id });
        if (!settings) {
            throw new AppError('Notification settings not found for this user.', 404);
        }

        if (transactionConfirmations !== undefined) {
            settings.transactionConfirmations.enabled = transactionConfirmations.enabled;
        }
        if (lowBalanceAlert !== undefined) {
            settings.lowBalanceAlert.enabled = lowBalanceAlert.enabled;
            if (lowBalanceAlert.threshold !== undefined) {
                const thresholdValue = parseFloat(lowBalanceAlert.threshold);
                if (isNaN(thresholdValue) || thresholdValue < 0) {
                    throw new AppError('Low balance threshold must be a non-negative number.', 400);
                }
                settings.lowBalanceAlert.threshold = thresholdValue;
            }
        }
        if (newLoginAlert !== undefined) {
            settings.newLoginAlert.enabled = newLoginAlert.enabled;
        }
        if (incorrectPinAttemptAlert !== undefined) {
            settings.incorrectPinAttemptAlert.enabled = incorrectPinAttemptAlert.enabled;
        }
        if (passwordChangeAlert !== undefined) {
            settings.passwordChangeAlert.enabled = passwordChangeAlert.enabled;
        }

        await settings.save();
        res.json({ message: 'Notification settings updated successfully!', settings });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
const mongoose = require('mongoose');

const NotificationSettingsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    transactionConfirmations: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    lowBalanceAlert: {
        enabled: {
            type: Boolean,
            default: true,
        },
        threshold: {
            type: Number,
            default: 1000,
            min: 0,
        },
    },
    newLoginAlert: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    incorrectPinAttemptAlert: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    passwordChangeAlert: {
        enabled: {
            type: Boolean,
            default: true,
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

NotificationSettingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('NotificationSettings', NotificationSettingsSchema);
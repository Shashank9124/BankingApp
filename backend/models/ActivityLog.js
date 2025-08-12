const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    activityType: {
        type: String,
        required: true,
        enum: [
            'login',
            'logout',
            'password-change',
            'password-reset',
            'pin-set',
            'pin-change',
            'deposit',
            'withdrawal',
            'transfer-out',
            'profile-update',
        ],
    },
    details: {
        type: Object,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
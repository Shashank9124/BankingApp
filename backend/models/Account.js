const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    accountNumber: {
        type: String,
        unique: true,
        required: true,
    },
    accountType: {
        type: String,
        required: true,
        enum: ['Zero Balance', 'Savings'],
    },
    balance: {
        type: Number,
        default: 0,
        min: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Account', AccountSchema);
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true,
    },
    account: {
        type: mongoose.Schema.ObjectId,
        ref: 'Account',
        required: function() { return this.type === 'deposit' || this.type === 'withdrawal' || this.type === 'transferOut'; }
    },
    type: {
        type: String,
        required: true,
        enum: ['deposit', 'withdrawal', 'transferIn', 'transferOut'],
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01,
    },
    status: {
        type: String,
        default: 'completed',
    },
    description: {
        type: String,
        default: '',
    },
    recipient: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: function() { return this.type === 'transferOut' || this.type === 'transferIn'; }
    },
    recipientAccount: {
        type: String,
        required: function() { return this.type === 'transferOut' || this.type === 'transferIn'; }
    },
    category: {
        type: String,
        required: function() { return this.type === 'withdrawal' || this.type === 'transferOut'; }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Transaction', TransactionSchema);
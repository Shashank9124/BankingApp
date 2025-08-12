const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        sparse: true,
        match: [
            /^\d{10}$/,
            'Please add a valid 10-digit mobile number',
        ],
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    resetPasswordOtp: String,
    resetPasswordOtpExpires: Date,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    failedLoginAttempts: {
        type: Number,
        default: 0,
    },
    lockUntil: {
        type: Date,
    },
    loginOtp: String,
    loginOtpExpires: Date,
    lowBalanceThreshold: {
        type: Number,
        default: 1000,
    },
    lastLowBalanceAlertSent: {
        type: Date,
        default: null,
    },
    transactionPin: {
        type: String,
        select: false,
    },
    failedPinAttempts: {
        type: Number,
        default: 0,
    },
    pinLockUntil: {
        type: Date,
    },
    categories: {
        type: [String],
        default: ['Food', 'Transport', 'Groceries', 'Bills', 'Shopping'],
    },
    monthlyBudgets: {
        type: Map,
        of: Number,
        default: {},
    },
});

UserSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    if (this.isModified('transactionPin') && this.transactionPin) {
        const salt = await bcrypt.genSalt(10);
        this.transactionPin = await bcrypt.hash(this.transactionPin, salt);
    }
    next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.matchTransactionPin = async function (enteredPin) {
    if (!this.transactionPin) return false;
    return await bcrypt.compare(enteredPin, this.transactionPin);
};

module.exports = mongoose.model('User', UserSchema);
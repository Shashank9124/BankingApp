require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transaction');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notification');
const analyticsRoutes = require('./routes/analytics');
const pdfRoutes = require('./routes/pdf');
const AppError = require('./utils/appError');

const app = express();

connectDB();

const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

app.use(helmet());
app.use(express.json());

const corsOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'];

app.use(cors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
}));

app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/pdf', pdfRoutes);

app.get('/', (req, res) => {
    res.send('Banking API is running successfully!');
});

app.use((err, req, res, next) => {
    if (err.errors) {
        const errors = err.errors.map(e => e.msg);
        return res.status(400).json({ message: errors.join(', ') });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    console.error('SERVER ERROR:', err.stack);
    res.status(500).json({
        message: 'Something went wrong on the server.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
}

module.exports = app;
const express = require('express');
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');
const sendEmail = require('../utils/emailService');
const AppError = require('../utils/appError');

const router = express.Router();

router.use(protect);

router.post('/statement', async (req, res, next) => {
    const { month, year, accountNumber } = req.body;

    if (!month || !year || !accountNumber) {
        return res.status(400).json({ message: 'Month, year, and account number are required to generate a statement.' });
    }

    try {
        const user = await User.findById(req.user._id);
        const account = await Account.findOne({ user: user._id, accountNumber });
        
        if (!user || !account) {
            return res.status(404).json({ message: 'User or account not found.' });
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        const transactions = await Transaction.find({
            user: user._id,
            account: account._id,
            createdAt: {
                $gte: startDate,
                $lte: endDate,
            }
        }).sort({ createdAt: 1 }).lean();

        const pdfBuffer = await new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const buffers = [];
            
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
            doc.on('error', reject);

            doc.fontSize(20).text('Monthly Transaction Statement', { align: 'center' });
            doc.fontSize(14).text(`\nFor the period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);
            doc.text(`\nAccount Holder: ${user.fullName}`);
            doc.text(`Account Number: ${account.accountNumber}`);
            doc.text(`Account Type: ${account.accountType}\n\n`);

            if (transactions.length > 0) {
                doc.moveDown();
                const tableHeaders = ['Date', 'Type', 'Category', 'Description', 'Amount (₹)'];
                let y = doc.y;
                const xPositions = [50, 150, 220, 320, 450];
                doc.font('Helvetica-Bold').fontSize(10);
                tableHeaders.forEach((header, i) => doc.text(header, xPositions[i], y));

                doc.font('Helvetica').fontSize(10).moveDown();
                y = doc.y;
                
                transactions.forEach((txn) => {
                    const date = txn.createdAt.toLocaleDateString();
                    const type = txn.type.toUpperCase();
                    const category = txn.category || 'N/A';
                    const description = txn.description || 'N/A';
                    const amount = txn.amount.toFixed(2);
                    
                    doc.text(date, xPositions[0], y);
                    doc.text(type, xPositions[1], y);
                    doc.text(category, xPositions[2], y);
                    doc.text(description, xPositions[3], y);
                    doc.text(amount, xPositions[4], y);
                    y += 20;
                });
            } else {
                doc.moveDown().text('No transactions found for this period.');
            }

            doc.end();
        });

        const statementFilename = `Statement_${accountNumber}_${year}_${month}.pdf`;
        const emailOptions = {
            email: user.email,
            subject: `Monthly Bank Statement for ${new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            message: `
                <p>Dear ${user.fullName},</p>
                <p>Attached is your monthly transaction statement for your ${account.accountType} account (No: ${account.accountNumber}).</p>
                <p>Thank you for banking with us!</p>
            `,
            attachments: [
                {
                    filename: statementFilename,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ],
        };
        await sendEmail(emailOptions);

        res.status(200).json({ message: 'Statement generated and sent to your email successfully.' });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
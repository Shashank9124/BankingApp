// routes/accounts.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Account = require('../models/Account');

/**
 * GET /api/accounts - Get all accounts for current user
 */
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user._id });
    res.json(accounts);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

/**
 * GET /api/accounts/:id - Get specific account by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user._id });
    if (!account) return res.status(404).send('Account not found');
    res.json(account);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

/**
 * POST /api/accounts - Create a new account
 */
router.post('/', auth, async (req, res) => {
  const { accountType, initialBalance } = req.body;

  try {
    const account = new Account({
      user: req.user._id,
      accountType,
      balance: initialBalance || 0,
    });

    await account.save();
    res.status(201).json(account);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
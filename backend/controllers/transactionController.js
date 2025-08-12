const User = require('../models/User');
const Transaction = require('../models/Transaction');

exports.deposit = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const user = await User.findById(userId);
    user.balance += parseFloat(amount);
    await user.save();

    const newTransaction = new Transaction({
      userId,
      type: 'deposit',
      amount
    });
    await newTransaction.save();

    res.json({ message: "Deposit successful", balance: user.balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.withdraw = async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const user = await User.findById(userId);

    if (user.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    user.balance -= parseFloat(amount);
    await user.save();

    const newTransaction = new Transaction({
      userId,
      type: 'withdraw',
      amount
    });
    await newTransaction.save();

    res.json({ message: "Withdrawal successful", balance: user.balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.transfer = async (req, res) => {
  const { amount, mobile } = req.body;
  const fromUserId = req.user.id;

  if (!amount || !mobile || amount <= 0) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findOne({ mobile });

    if (!toUser) return res.status(400).json({ error: "Recipient not found" });
    if (fromUser.balance < amount) return res.status(400).json({ error: "Insufficient balance" });

    // Deduct from sender
    fromUser.balance -= parseFloat(amount);
    await fromUser.save();

    // Add to receiver
    toUser.balance += parseFloat(amount);
    await toUser.save();

    // Record transfer
    const newTransfer = new Transaction({
      userId: fromUserId,
      type: 'transfer',
      amount,
      toUserId: toUser._id
    });
    await newTransfer.save();

    res.json({ message: "Transfer successful", balance: fromUser.balance });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTransactionHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const transactions = await Transaction.find({
      $or: [
        { userId },
        { toUserId: userId }
      ]
    }).populate('userId', 'name').populate('toUserId', 'name');

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
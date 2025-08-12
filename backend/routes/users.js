// routes/users.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

/**
 * GET /api/users/me - Get current user info
 */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.send(user);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

/**
 * POST /api/users/register - Register new user
 */
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).send('User already exists');

    user = new User({ name, email, password });
    await user.save();

    const token = user.generateAuthToken();

    res.header('x-auth-token', token).send({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
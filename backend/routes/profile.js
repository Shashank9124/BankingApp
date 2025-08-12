const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get user profile
router.get('/me', async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .select('-password -__v');
        
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ 
            message: error.message 
        });
    }
});

// Update profile
router.put('/update', async (req, res) => {
    try {
        const updates = Object.keys(req.body);
        const allowedUpdates = ['name', 'email', 'mobileNumber'];
        const isValidOperation = updates.every(update => 
            allowedUpdates.includes(update)
        );

        if (!isValidOperation) {
            return res.status(400).json({ 
                message: 'Invalid updates' 
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            req.body,
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ 
            message: error.message 
        });
    }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, adminKey } = req.body;

    if (!username || !password || !adminKey) {
        return res.status(400).json({ message: 'Username, password, and adminKey are required.' });
    }

    if (adminKey !== process.env.REGISTRATION_ADMIN_KEY) {
        return res.status(403).json({ message: 'Invalid admin key.' });
    }

    try {
        const existingUser = await userModel.findUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ message: 'Username already exists.' });
        }

        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        const newUser = await userModel.createUser({ username, password_hash });

        res.status(201).json({
            message: 'User created successfully',
            user: {
                user_id: newUser.user_id,
                username: newUser.username,
            },
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'An error occurred during registration.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const user = await userModel.findUserByUsername(username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // セッションにユーザー情報を保存
        req.session.user = {
            id: user.user_id,
            username: user.username,
        };

        res.status(200).json({
            message: 'Logged in successfully',
            user: req.session.user,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An error occurred during login.' });
    }
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.status(200).json(req.session.user);
    } else {
        res.status(401).json({ message: 'Not authenticated' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out, please try again.' });
        }
        res.clearCookie('connect.sid'); // セッションクッキーをクリア
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

module.exports = router;

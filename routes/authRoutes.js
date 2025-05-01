const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

router.post('/signup', async(req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check existing user
        const [existing] = await req.db.query(
            'SELECT id FROM users WHERE email = ?', [email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const [result] = await req.db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]
        );

        // Generate JWT
        const token = jwt.sign({ id: result.insertId },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: result.insertId, name, email }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

router.post('/signin', async(req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const [users] = await req.db.query(
            'SELECT id, name, email, password FROM users WHERE email = ?', [email]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign({ id: user.id },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

module.exports = router;
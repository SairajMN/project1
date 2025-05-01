const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

router.get('/profile', authMiddleware, async(req, res) => {
    try {
        const [profile] = await req.db.query(
            `SELECT u.id, u.name, u.email, u.created_at, 
       p.address, p.phone
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`, [req.user.id]
        );

        res.json(profile[0]);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

module.exports = router;
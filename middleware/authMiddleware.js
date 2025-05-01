const jwt = require('jsonwebtoken');

const authMiddleware = async(req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader ? .startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verify user exists in database
        const [user] = await req.db.query(
            'SELECT id, name, email FROM users WHERE id = ?', [decoded.id]
        );

        if (!user.length) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user[0];
        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({
            message: error.name === 'TokenExpiredError' ?
                'Session expired' :
                'Invalid token'
        });
    }
};

module.exports = authMiddleware;
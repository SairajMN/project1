require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('./db');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5500',
  credentials: true
}));
app.use(express.json());
app.use(express.static('public'));

// Database middleware
app.use((req, res, next) => {
  req.db = db;
  next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shopiee.html'));
  });

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        code: 'MISSING_TOKEN',
        message: 'Authorization token required' 
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [user] = await db.query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?', 
      [decoded.id]
    );

    if (!user.length || !user[0].created_at) {
      return res.status(401).json({
        code: 'INVALID_USER',
        message: 'User not found or account disabled'
      });
    }

    req.user = user[0];
    next();
  } catch (error) {
    console.error('Auth error:', error);
    let code = 'AUTH_ERROR';
    let message = 'Authentication failed';

    if (error.name === 'TokenExpiredError') {
      code = 'TOKEN_EXPIRED';
      message = 'Session expired. Please login again';
    } else if (error.name === 'JsonWebTokenError') {
      code = 'INVALID_TOKEN';
      message = 'Invalid authentication token';
    }

    res.status(401).json({ code, message });
  }
};

// Routes
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'All fields are required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        code: 'INVALID_EMAIL',
        message: 'Please enter a valid email'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        code: 'WEAK_PASSWORD',
        message: 'Password must be at least 8 characters'
      });
    }

    // Check existing user
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        code: 'EMAIL_EXISTS',
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    // Create empty profile
    await db.query(
      'INSERT INTO profiles (id) VALUES (?)',
      [result.insertId]
    );

    // Generate token
    const token = jwt.sign(
      { id: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        name,
        email
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Error creating account'
    });
  }
});

app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user
    const [users] = await db.query(
      'SELECT id, name, email, password FROM users WHERE email = ?',
      [email]
    );

    if (!users.length) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Error signing in'
    });
  }
});

// Protected routes
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const [profile] = await db.query(
      `SELECT u.id, u.name, u.email, u.created_at,
              p.address, p.phone
       FROM users u
       LEFT JOIN profiles p ON u.id = user_id
       WHERE u.id = ?`,
      [req.user.id]
    );

    res.json(profile[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to load profile'
    });
  }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
  const { address, phone } = req.body;

  try {
    await db.query(
      `UPDATE profiles 
       SET address = ?, phone = ?
       WHERE id = ?`,
      [address || null, phone || null, req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      code: 'SERVER_ERROR',
      message: 'Failed to update profile'
    });
  }
});

app.post('/api/order', authMiddleware, async (req, res) => {
  const { product_name, quantity, address } = req.body;

  try {
    if (!product_name || !quantity || !address) {
      return res.status(400).json({
        code: 'MISSING_FIELDS',
        message: 'Product, quantity and address are required'
      });
    }

    const [result] = await db.query(
      `INSERT INTO orders 
       (product_name, quantity, customer_name, email, address, id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        quantity,
        req.user.name,
        req.user.email,
        address,
        req.id,
        new Date()
      ]
    );

    res.status(201).json({
      orderId: result.insertId,
      message: 'Order placed successfully'
    });

  } catch (error) {
  console.error('Order error:', error);
  console.error('Error details:', {
    product_name,
    quantity,
    address,
    user: req.user
  });
  res.status(500).json({
    code: 'SERVER_ERROR',
    message: 'Failed to place order',
    error: error.message // Include the actual error message
  });
}
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    code: 'SERVER_ERROR',
    message: 'Internal server error'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
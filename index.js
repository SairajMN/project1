require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('./db');
const bcrypt = require('bcrypt');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5500' // Update to your frontend URL if needed
}));
app.use(express.json());

// Serve static files (e.g., frontend build)
app.use(express.static(path.join(__dirname, 'public'))); // Serve static frontend files from /public

// Optional: fallback to index.html (for React Router SPA)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'shopiee.html'));
});

// Attach DB connection to request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Email validation helper
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user] = await db.query('SELECT id FROM users WHERE id = ?', [decoded.id]);
    if (!user.length) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user[0];
    next();
  } catch (error) {
    res.status(401).json({
      message: error.name === 'TokenExpiredError'
        ? 'Session expired'
        : 'Invalid token'
    });
  }
};

// Signup route
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    await db.query('INSERT INTO profiles (user_id) VALUES (?)', [result.insertId]);

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: { id: result.insertId, name, email }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Error signing up', error: err.message });
  }
});

// Signin route
app.post('/api/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await db.query(
      'SELECT id, name, email, password FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ message: 'Error signing in', error: err.message });
  }
});

// Profile routes
app.get('/api/profile', authenticate, async (req, res) => {
  try {
    const [userData] = await db.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             p.address, p.phone
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE u.id = ?
    `, [req.user.id]);

    res.json(userData[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/profile', authenticate, async (req, res) => {
  const { address, phone } = req.body;

  try {
    await db.query(`
      UPDATE profiles 
      SET 
        address = COALESCE(?, address),
        phone = COALESCE(?, phone)
      WHERE user_id = ?
    `, [address, phone, req.user.id]);

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Order route
app.post('/api/order', authenticate, async (req, res) => {
  const { product_name, quantity, address } = req.body;

  try {
    if (!product_name || !quantity || !address) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const [user] = await db.query(
      'SELECT name, email FROM users WHERE id = ?',
      [req.user.id]
    );

    const [result] = await db.query(
      'INSERT INTO orders (product_name, quantity, customer_name, email, address, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [product_name, quantity, user[0].name, user[0].email, address, req.user.id, new Date()]
    );

    res.status(201).json({
      message: 'Order placed successfully!',
      orderId: result.insertId
    });

  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ message: 'Error placing order', error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

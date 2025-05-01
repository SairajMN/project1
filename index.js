require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const db = require('./db'); // MySQL database connection
const bcrypt = require('bcrypt'); // For password hashing (if needed)
const profileRoutes = require('./routes/profileRoutes');
// Initialize the app
const app = express();

// Middleware to parse JSON and handle CORS
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve static files
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Auth routes
app.use('/auth', authRoutes);
app.use('/api', profileRoutes);

// Serve the homepage (shopiee.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'shopiee.html'));
});

// Mock databases (remove this when you use actual DB)
// let users = [];
// let orders = [];

// Signup with email
app.post('/api/signup', async(req, res) => {
    const { email, password } = req.body;

    try {
        // Validate email format
        if (!validateEmail(email)) {
            return res.status(400).send({ message: 'Invalid email format' });
        }

        // Check if email already exists
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).send({ message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]
        );

        // Create empty profile
        await db.query(
            'INSERT INTO profiles (user_id) VALUES (?)', [result.insertId]
        );

        // Return response
        res.status(201).json({
            id: result.insertId,
            name,
            email
        });
        res.status(201).send({ message: 'Signup successful' });
    } catch (err) {
        res.status(500).send({ message: 'Error signing up', error: err.message });
    }
});

// Signin with email
app.get('/api/profile', async(req, res) => {
    try {
        // Verify JWT token from headers
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [userData] = await db.query(`
            SELECT u.id, u.name, u.email, u.created_at,
                   p.address, p.phone, p.avatar_url
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?
        `, [decoded.id]);

        res.json(userData[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New profile endpoint
app.put('/api/profile', async(req, res) => {
    const { address, phone } = req.body;
    const userId = req.user.id; // From JWT middleware

    await db.query(`
        UPDATE profiles 
        SET 
            address = COALESCE(?, address),
            phone = COALESCE(?, phone)
        WHERE user_id = ?
    `, [address, phone, userId]);

    res.json({ message: 'Profile updated successfully' });
});


// Place Order Route (using DB)
app.post('/api/order', async(req, res) => {
    const { product_name, quantity, customer_name, email, address } = req.body;

    if (!product_name || !quantity || !customer_name || !email || !address) {
        return res.status(400).send({ message: 'All fields are required.' });
    }

    try {
        const newOrder = {
            product_name,
            quantity,
            customer_name,
            email,
            address,
            createdAt: new Date()
        };

        // Insert the order into the database
        const [result] = await db.query('INSERT INTO orders (product_name, quantity, customer_name, email, address, created_at) VALUES (?, ?, ?, ?, ?, ?)', [product_name, quantity, customer_name, email, address, newOrder.createdAt]);

        newOrder.id = result.insertId;
        res.status(201).send({ message: 'Order placed successfully!', order: newOrder });
    } catch (err) {
        res.status(500).send({ message: 'Error placing order', error: err.message });
    }
});

// Database Test Route
app.get('/test-db', async(req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.json({ dbWorks: true, result: rows[0].result });
    } catch (err) {
        res.status(500).json({ dbWorks: false, error: err.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke!' });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
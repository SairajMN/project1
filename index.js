const express = require('express');
const app = express();
app.use(express.json());

// Mock database
let users = [];

// Routes
app.post('/api/signup', (req, res) => {
    const { email, password } = req.body;
    if (users.find(user => user.email === email)) {
        return res.status(400).send({ message: 'User already exists' });
    }
    users.push({ email, password }); // Store user in a mock database
    res.status(201).send({ message: 'Signup successful' });
});

app.post('/api/signin', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).send({ message: 'Invalid credentials' });
    }
    res.send({ message: 'Signin successful' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
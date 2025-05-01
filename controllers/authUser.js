const bcrypt = require('bcrypt');
const User = require('../models/User'); // Assuming you have a User model

// Function to handle login
const loginUser = async(req, res) => {
    try {
        const { username, password } = req.body;

        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('User not found');
        }

        // Compare the password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).send('Invalid password');
        }

        // If passwords match, proceed with login
        res.status(200).send('Login successful');
    } catch (err) {
        res.status(500).send('Error logging in');
    }
};

module.exports = { loginUser };
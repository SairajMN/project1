// models/User.js
const db = require('../db'); // Assuming 'db' is a MySQL connection module

// Create a new user
async function createUser(email, hashedPassword) {
    const [result] = await db.execute(
        'INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]
    );
    return result;
}

// Find user by username
async function findUserByemail(email) {
    const [rows] = await db.execute(
        'SELECT * FROM users WHERE email = ?', [email]
    );
    return rows[0]; // return the first user found (or undefined if no user)
}

module.exports = {
    createUser,
    findUserByemail
};
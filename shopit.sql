-- Database creation
CREATE DATABASE IF NOT EXISTS shopit;
USE shopit;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    user_id INT PRIMARY KEY,
    address TEXT,
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Optional: Initial admin user (change password after creation)
INSERT INTO users (name, email, password) VALUES (
    'Admin User',
    'admin@example.com',
    '$2b$10$examplehashedpassword' -- Replace with actual hashed password
);

-- Create a stored procedure for user registration
DELIMITER //
CREATE PROCEDURE register_user(
    IN p_name VARCHAR(255),
    IN p_email VARCHAR(100),
    IN p_password VARCHAR(255)
)
BEGIN
    DECLARE user_count INT;
    DECLARE user_id INT;
    
    -- Check if email exists
    SELECT COUNT(*) INTO user_count FROM users WHERE email = p_email;
    
    IF user_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Email already registered';
    ELSE
        -- Insert user
        INSERT INTO users (name, email, password) 
        VALUES (p_name, p_email, p_password);
        
        SET user_id = LAST_INSERT_ID();
        
        -- Create profile
        INSERT INTO profiles (user_id) VALUES (user_id);
        
        -- Return user ID
        SELECT user_id AS id;
    END IF;
END //
DELIMITER ;

-- Create a view for user profiles
CREATE VIEW user_profiles AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.created_at,
    p.address,
    p.phone,
    p.avatar_url
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id;

-- Create a trigger for order status change logging
CREATE TABLE IF NOT EXISTS order_status_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

DELIMITER //
CREATE TRIGGER after_order_status_update
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO order_status_log (order_id, old_status, new_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
END //
DELIMITER ;

-- Create event for cleaning up old sessions (if needed)
DELIMITER //
CREATE EVENT clean_expired_tokens
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
    -- Logic to clean expired tokens if you store them in DB
    -- DELETE FROM user_tokens WHERE expires_at < NOW();
END //
DELIMITER ;
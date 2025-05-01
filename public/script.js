// Utility Functions
const showAlert = (message, type = 'error') => {
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;
    document.body.prepend(alertBox);
    setTimeout(() => alertBox.remove(), 5000);
};

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

const validatePassword = (password) => {
    return password.length >= 8;
};

const handleFormSubmit = async (e, endpoint, successMessage) => {
    e.preventDefault();
    const form = e.target;
    const button = form.querySelector('button');
    const originalText = button.textContent;
    
    try {
        button.disabled = true;
        button.textContent = 'Processing...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Validation
        if (form.id === 'signupForm' && !data.name) {
            throw new Error('Please enter your name');
        }

        if (!validateEmail(data.email)) {
            throw new Error('Please enter a valid email address');
        }

        if (!validatePassword(data.password)) {
            throw new Error('Password must be at least 8 characters');
        }

        const response = await fetch(`http://localhost:3000/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        
        if (!response.ok) {
            throw new Error(responseData.message || 'Something went wrong');
        }

        showAlert(successMessage, 'success');
        form.reset();

        // Redirect on successful sign-in
        if (endpoint === 'signin') {
            localStorage.setItem('authToken', responseData.token);
            window.location.href = '/profile.html';
        }

    } catch (error) {
        showAlert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
};

localStorage.setItem('token', responseData.token);
localStorage.setItem('user', JSON.stringify(responseData.user));
// Event Listeners
document.getElementById('signupForm')?.addEventListener('submit', (e) => {
    handleFormSubmit(e, 'signup', 'Signup successful! Please sign in.');
});

document.getElementById('signinForm')?.addEventListener('submit', (e) => {
    handleFormSubmit(e, 'signin', 'Sign-in successful! Redirecting...');
});

const form = document.getElementById('orderForm');
        const messageDiv = document.getElementById('message');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const orderData = {
                product_name: document.getElementById('product_name').value,
                quantity: document.getElementById('quantity').value,
                customer_name: document.getElementById('customer_name').value,
                email: document.getElementById('email').value,
                address: document.getElementById('address').value
            };

            try {
                const response = await fetch('http://localhost:3000/api/order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                });

                const result = await response.json();

                if (response.ok) {
                    messageDiv.style.color = 'green';
                    messageDiv.innerText = result.message;
                    form.reset(); // Clear the form
                } else {
                    messageDiv.style.color = 'red';
                    messageDiv.innerText = result.message || 'Something went wrong.';
                }
            } catch (error) {
                messageDiv.style.color = 'red';
                messageDiv.innerText = 'Error placing order. Server might be down.';
            }
        });


        // Get user profile data
        async function fetchProfile() {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    window.location.href = '/signin.html';
                    return;
                }

                const response = await fetch('http://localhost:3000/api/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.status === 401) {
                    localStorage.removeItem('token');
                    window.location.href = '/signin.html';
                    return;
                }

                const data = await response.json();

                document.getElementById('name').textContent = data.user.name || 'N/A';
                document.getElementById('email').textContent = data.user.email;
                document.getElementById('createdAt').textContent = new Date(data.user.createdAt).toLocaleDateString();

            } catch (error) {
                console.error('Error fetching profile:', error);
                alert('Error loading profile data');
            }
        }

        function logout() {
            localStorage.removeItem('token');
            window.location.href = '/signin.html';
        }

        // Check authentication on page load
        (function init() {
            const token = localStorage.getItem('token');
            if (!token) {
                window.location.href = '/signin.html';
            } else {
                fetchProfile();
            }
        })();
        async function loadProfile() {
            try {
                const response = await fetch('/api/profile', {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const profileData = await response.json();

                // Populate form fields
                document.getElementById('name').textContent = profileData.name;
                document.getElementById('email').textContent = profileData.email;
                document.getElementById('address').value = profileData.address || '';
                document.getElementById('phone').value = profileData.phone || '';

            } catch (error) {
                console.error('Profile load error:', error);
            }
        }
// Add this interceptor for all fetch calls
const originalFetch = fetch;
window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    if (response.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/signin.html'; // Redirect to signin
        throw new Error('Session expired');
    }
    return response;
};

// Alternative: Per-request error handling
try {
    const response = await fetch('/api/protected-route', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    if (!response.ok) throw await response.json();
} catch (error) {
    if (error.statusCode === 401) {
        // ADD REDIRECT LOGIC HERE ▼
        localStorage.removeItem('token');
        window.location.href = '/signin.html';
    }
}
    
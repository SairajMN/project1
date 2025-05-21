document.getElementById('signupForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const button = e.target.querySelector('button');
    button.disabled = true;
    button.textContent = 'Signing Up.';

    try {
        // Client-side validation
        if (!validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const data = Object.fromEntries(formData.entries());

        const response = await fetch('http://localhost:3000/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message);

        // Save token if needed
        localStorage.setItem('token', responseData.token);

        // ✅ Redirect to profile.html
        window.location.href = 'profile.html';
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Sign Up';
    }
});

document.getElementById('signinForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const button = e.target.querySelector('button');
    button.disabled = true;
    button.textContent = 'Signing In.';

    try {
        if (!validateEmail(email)) {
            throw new Error('Please enter a valid email address');
        }

        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }

        const data = Object.fromEntries(formData.entries());

        const response = await fetch('http://localhost:3000/api/signin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message);

        localStorage.setItem('token', responseData.token);

        // ✅ Redirect after login too if needed
        window.location.href = 'profile.html';
    } catch (error) {
        alert(error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Sign In';
    }
});

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

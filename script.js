document.addEventListener('DOMContentLoaded', function() {
    const signup - form = document.getElementById('signup-form');
    const signin - form = document.getElementById('signin-form');

    signup - form.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;

        if (!email || !password) {
            alert('Please fill in both fields.');
            return;
        }

        sendDataToServer('signup', email, password);
    });

    signin - form.addEventListener('submit', function(event) {
        event.preventDefault();
        const email = document.getElementById('signinEmail').value;
        const password = document.getElementById('signinPassword').value;

        if (!email || !password) {
            alert('Please fill in both fields.');
            return;
        }

        sendDataToServer('signin', email, password);
    });

    function sendDataToServer(action, email, password) {
        fetch('/api/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action,
                    email,
                    password
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(`${action.toUpperCase()} Successful`);
                    if (action === 'signup') {
                        sendVerificationEmail(email);
                    }
                } else {
                    alert('Failed to sign up/sign in');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred during sign up/sign in');
            });
    }

    function sendVerificationEmail(email) {
        console.log(`Sending verification email to ${email}`);
    }
});
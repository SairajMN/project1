document.getElementById('signupForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(response.statusText);
        // Handle successful signup here
    } catch (error) {
        console.error(error);
        // Handle error
    }
});

document.getElementById('signinForm').addEventListener('submit', async(e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    try {
        const response = await fetch('/api/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error(response.statusText);
        // Handle successful signin here
    } catch (error) {
        console.error(error);
        // Handle error
    }
});
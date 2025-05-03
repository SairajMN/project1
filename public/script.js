document.addEventListener('DOMContentLoaded', () => {
    // Auth Service
    const AuthService = {
      storeToken: (token) => localStorage.setItem('token', token),
      getToken: () => localStorage.getItem('token'),
      clearToken: () => localStorage.removeItem('token'),
      
      fetchWithAuth: async (url, options = {}) => {
        const token = AuthService.getToken();
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers,
          ...(token && { 'Authorization': `Bearer ${token}` })
        };
  
        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
          AuthService.clearToken();
          window.location.href = '/signin.html?session=expired';
          throw new Error('Session expired');
        }
        
        return response;
      }
    };
  
    // UI Utilities
    const UI = {
      showAlert: (message, type = 'error') => {
        const alert = document.createElement('div');
        alert.className = `alert ${type}`;
        alert.textContent = message;
        document.body.prepend(alert);
        setTimeout(() => alert.remove(), 5000);
      },
      
      toggleLoader: (button, show) => {
        if (show) {
          button.dataset.originalText = button.textContent;
          button.disabled = true;
          button.innerHTML = '<span class="loader"></span> Processing...';
        } else {
          button.disabled = false;
          button.textContent = button.dataset.originalText;
        }
      }
    };
  
    // Auth Handlers
    const setupAuthForms = () => {
      const handleAuth = async (e, endpoint) => {
        e.preventDefault();
        const form = e.target;
        const button = form.querySelector('button');
        
        try {
          UI.toggleLoader(button, true);
          
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          
          // Validation
          if (form.id === 'signupForm' && !data.name) {
            throw new Error('Please enter your name');
          }
          
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            throw new Error('Please enter a valid email');
          }
          
          if (data.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
          }
          
          const response = await AuthService.fetchWithAuth(
            `http://localhost:3000/api/${endpoint}`, 
            {
              method: 'POST',
              body: JSON.stringify(data)
            }
          );
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.message || 'Authentication failed');
          }
          
          AuthService.storeToken(result.token);
          UI.showAlert(
            endpoint === 'signin' 
              ? 'Sign-in successful! Redirecting...' 
              : 'Account created successfully!',
            'success'
          );
          
          if (endpoint === 'signin') {
            setTimeout(() => {
              window.location.href = '/profile.html';
            }, 1500);
          } else {
            form.reset();
          }
          
        } catch (error) {
          UI.showAlert(error.message);
        } finally {
          UI.toggleLoader(button, false);
        }
      };
      
      document.getElementById('signupForm')?.addEventListener('submit', (e) => {
        handleAuth(e, 'signup');
      });
      
      document.getElementById('signinForm')?.addEventListener('submit', (e) => {
        handleAuth(e, 'signin');
      });
    };
  
    // Order Form Handler
    const setupOrderForm = () => {
      const form = document.getElementById('orderForm');
      if (!form) return;
      
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const button = form.querySelector('button');
        const messageDiv = document.getElementById('message');
        
        try {
          UI.toggleLoader(button, true);
          messageDiv.textContent = '';
          
          const orderData = {
            product_name: form.product_name.value,
            quantity: form.quantity.value,
            customer_name: form.customer_name.value,
            email: form.email.value,
            address: form.address.value
          };
          
          
          const response = await AuthService.fetchWithAuth(
            'http://localhost:3000/api/order',
            {
              method: 'POST',
              body: JSON.stringify(orderData)
            }
          );
          
          const result = await response.json();
          
          if (response.ok) {
            messageDiv.style.color = 'green';
            messageDiv.textContent = result.message;
            form.reset();
          } else {
            throw new Error(result.message || 'Order failed');
          }
        } catch (error) {
          messageDiv.style.color = 'red';
          messageDiv.textContent = error.message;
        } finally {
          UI.toggleLoader(button, false);
        }
      });
    };
  
    // Profile Management
    const setupProfile = () => {
      if (!window.location.pathname.includes('profile.html')) return;
      
      const loadProfile = async () => {
        try {
          const response = await AuthService.fetchWithAuth(
            'http://localhost:3000/api/profile'
          );
          
          const profile = await response.json();
          
          document.getElementById('name').textContent = profile.name;
          document.getElementById('email').textContent = profile.email;
          document.getElementById('createdAt').textContent = 
            new Date(profile.created_at).toLocaleDateString();
            
        } catch (error) {
          console.error('Profile load error:', error);
          UI.showAlert('Failed to load profile data');
        }
      };
      
      document.querySelector('[data-logout]')?.addEventListener('click', () => {
        AuthService.clearToken();
        window.location.href = '/signin.html';
      });
      
      loadProfile();
    };
  
    // Initialize
    const init = () => {
      if (!AuthService.getToken() && 
          !['/signin.html', '/signup.html'].includes(window.location.pathname)) {
        window.location.href = '/signin.html';
      }
      
      setupAuthForms();
      setupOrderForm();
      setupProfile();
    };
  
    init();
  });
import { authAPI } from './api.js';

// Check if user is already logged in
if (authAPI.isLoggedIn()) {
  window.location.href = '/index.html';
}

// Handle login form submission
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('loginError');

    // Clear previous errors
    if (errorDiv) errorDiv.style.display = 'none';

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const response = await authAPI.login(email, password);

      if (response.success) {
        // Show success message
        showNotification('Login successful! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
      }
    } catch (error) {
      // Show error message
      if (errorDiv) {
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
      }
      showNotification(error.message || 'Login failed', 'error');
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (notification) {
    const messageEl = notification.querySelector('.notification-message');
    messageEl.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }
}
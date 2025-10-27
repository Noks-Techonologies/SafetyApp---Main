import { authAPI } from './api.js';

// Check if user is already logged in
if (authAPI.isLoggedIn()) {
  window.location.href = '/index.html';
}

// Handle registration form submission
const signinForm = document.getElementById('signinForm');
if (signinForm) {
  signinForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    const submitBtn = signinForm.querySelector('button[type="submit"]');
    const errorDiv = document.getElementById('signinError');

    // Clear previous errors
    if (errorDiv) errorDiv.style.display = 'none';

    // Validate passwords match
    if (confirmPassword && password !== confirmPassword) {
      if (errorDiv) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.style.display = 'block';
      }
      showNotification('Passwords do not match', 'error');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      if (errorDiv) {
        errorDiv.textContent = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
        errorDiv.style.display = 'block';
      }
      showNotification('Password is too weak', 'error');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    try {
      const response = await authAPI.register(name, email, password);

      if (response.success) {
        // Show success message
        showNotification('Account created successfully! Redirecting...', 'success');
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/index.html';
        }, 1000);
      }
    } catch (error) {
      // Show error message
      if (errorDiv) {
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
      }
      showNotification(error.message || 'Registration failed', 'error');
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
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
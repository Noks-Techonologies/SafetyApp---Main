// utils.js

// Show notifications
export function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  const messageElement = notification.querySelector('.notification-message');
  const closeButton = notification.querySelector('.notification-close');

  messageElement.textContent = message;
  notification.classList.remove('success', 'error', 'warning');
  notification.classList.add(type, 'show');

  setTimeout(() => notification.classList.remove('show'), 5000);
  closeButton.onclick = () => notification.classList.remove('show');
}

// Get GPS coordinates
export function getCurrentLocationCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      }),
      err => reject(new Error('Location access failed: ' + err.message)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Format coordinates nicely
export function formatCoordinates(lat, lon) {
  return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

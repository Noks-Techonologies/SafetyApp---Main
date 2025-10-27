import { trackerAPI } from './api.js';
import { showNotification } from './main.js';

let currentTracker = null;
let locationUpdateInterval = null;

export function initTracker() {
  const trackerForm = document.getElementById('childTrackerForm');
  
  if (trackerForm) {
    // Load existing trackers
    loadTrackers();
    
    trackerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const childName = document.getElementById('childName').value;
      const contactNumber = document.getElementById('childSim').value;
      const deviceId = document.getElementById('childDeviceId').value;

      try {
        const response = await trackerAPI.createTracker(childName, contactNumber, deviceId);
        
        if (response.success) {
          showNotification('Tracker created successfully!', 'success');
          currentTracker = response.data.tracker;
          
          // Reset form
          trackerForm.reset();
          
          // Update UI
          updateTrackerUI();
          
          // Start tracking
          startTracking();
        }
      } catch (error) {
        showNotification(error.message || 'Failed to create tracker', 'error');
      }
    });
  }
}

async function loadTrackers() {
  try {
    const response = await trackerAPI.getTrackers();
    
    if (response.success && response.data.trackers.length > 0) {
      // Get the most recent active tracker
      currentTracker = response.data.trackers.find(t => t.isActive) || response.data.trackers[0];
      
      if (currentTracker) {
        // Populate form with existing data
        document.getElementById('childName').value = currentTracker.childName;
        document.getElementById('childSim').value = currentTracker.contactNumber;
        document.getElementById('childDeviceId').value = currentTracker.deviceId;
        
        // Update UI
        updateTrackerUI();
        
        // Start tracking if active
        if (currentTracker.isActive) {
          startTracking();
        }
      }
    }
  } catch (error) {
    console.error('Failed to load trackers:', error);
  }
}

function updateTrackerUI() {
  const statusElement = document.getElementById('trackerStatus');
  const locationElement = document.getElementById('childLocation');
  const mapContainer = document.getElementById('mapContainer');
  
  if (!currentTracker) return;
  
  // Update status
  if (statusElement) {
    const statusDot = statusElement.querySelector('.status-dot');
    const statusText = statusElement.querySelector('.status-text');
    
    if (currentTracker.isActive) {
      statusDot.classList.remove('inactive');
      statusDot.classList.add('active');
      statusText.textContent = `Tracking ${currentTracker.childName}`;
    } else {
      statusDot.classList.add('inactive');
      statusDot.classList.remove('active');
      statusText.textContent = 'Tracking inactive';
    }
  }
  
  // Update location
  if (currentTracker.lastLocation && locationElement) {
    const { latitude, longitude, address, timestamp } = currentTracker.lastLocation;
    
    locationElement.innerHTML = `
      <p><strong>Last Updated:</strong> ${new Date(timestamp).toLocaleString()}</p>
      <p><strong>Address:</strong> ${address || 'Unknown'}</p>
      <p><strong>Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</p>
      <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank" class="btn btn-primary">
        📍 View on Google Maps
      </a>
    `;
    
    // Update map
    if (mapContainer) {
      mapContainer.innerHTML = `
        <iframe
          width="100%"
          height="400"
          frameborder="0"
          style="border:0"
          src="https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${latitude},${longitude}&zoom=15"
          allowfullscreen>
        </iframe>
      `;
    }
  } else if (locationElement) {
    locationElement.textContent = 'No location data available';
  }
}

function startTracking() {
  if (!currentTracker) return;
  
  showNotification(`Started tracking ${currentTracker.childName}`, 'success');
  
  // Update location every 30 seconds
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }
  
  locationUpdateInterval = setInterval(updateTrackerLocation, 30000);
  
  // Update immediately
  updateTrackerLocation();
}

async function updateTrackerLocation() {
  if (!currentTracker || !currentTracker.isActive) return;
  
  try {
    // Get current location
    const position = await getCurrentPosition();
    const { latitude, longitude, accuracy } = position.coords;
    
    // Get address from coordinates (reverse geocoding)
    const address = await getAddressFromCoords(latitude, longitude);
    
    // Update location in backend
    const response = await trackerAPI.updateLocation(
      currentTracker._id,
      latitude,
      longitude,
      accuracy,
      address
    );
    
    if (response.success) {
      currentTracker.lastLocation = response.data.lastLocation;
      updateTrackerUI();
    }
  } catch (error) {
    console.error('Failed to update location:', error);
  }
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}

async function getAddressFromCoords(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
    );
    const data = await response.json();
    return data.display_name || 'Address not available';
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Address not available';
  }
}

// Stop tracking when leaving the page
window.addEventListener('beforeunload', () => {
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval);
  }
});
import { showNotification, formatDateTime, generateId, getCurrentLocationCoords, formatCoordinates } from './main.js';
import { saveToStorage, getFromStorage } from './storage.js';

let locationWatcher = null;
let sharingActive = false;
let currentLocationData = null;

export function initLocation() {
    const shareLocationBtn = document.getElementById('shareLocationBtn');
    const stopSharingBtn = document.getElementById('stopSharingBtn');
    
    if (shareLocationBtn) {
        shareLocationBtn.addEventListener('click', startLocationSharing);
    }
    
    if (stopSharingBtn) {
        stopSharingBtn.addEventListener('click', stopLocationSharing);
    }
    
    loadWatchGroups();
    initializeDefaultWatchGroups();
    updateLocationStatus();
}

async function startLocationSharing() {
    if (sharingActive) {
        showNotification('Location sharing is already active', 'warning');
        return;
    }

    try {
        // Get initial location
        const coords = await getCurrentLocationCoords();
        
        currentLocationData = {
            id: generateId(),
            type: 'location',
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            timestamp: new Date().toISOString(),
            sharing: true
        };

        // Start watching location
        if (navigator.geolocation) {
            locationWatcher = navigator.geolocation.watchPosition(
                updateLocation,
                handleLocationError,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000 // 30 seconds
                }
            );
        }

        sharingActive = true;
        updateLocationStatus();
        updateLocationDisplay();
        
        // Save location update
        saveLocationUpdate(currentLocationData);
        
        showNotification('Location sharing started successfully!', 'success');
        
        // Notify watch groups
        notifyWatchGroups('started sharing location');

    } catch (error) {
        showNotification(`Failed to start location sharing: ${error.message}`, 'error');
    }
}

function stopLocationSharing() {
    if (!sharingActive) {
        showNotification('Location sharing is not active', 'warning');
        return;
    }

    // Stop watching location
    if (locationWatcher) {
        navigator.geolocation.clearWatch(locationWatcher);
        locationWatcher = null;
    }

    sharingActive = false;
    
    if (currentLocationData) {
        currentLocationData.sharing = false;
        currentLocationData.stoppedAt = new Date().toISOString();
        saveLocationUpdate(currentLocationData);
    }

    updateLocationStatus();
    updateLocationDisplay();
    
    showNotification('Location sharing stopped', 'success');
    
    // Notify watch groups
    notifyWatchGroups('stopped sharing location');
}

function updateLocation(position) {
    if (!sharingActive) return;

    currentLocationData = {
        ...currentLocationData,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
    };

    updateLocationDisplay();
    saveLocationUpdate(currentLocationData);
}

function handleLocationError(error) {
    let message;
    switch (error.code) {
        case error.PERMISSION_DENIED:
            message = 'Location access denied';
            stopLocationSharing();
            break;
        case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
        case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        default:
            message = 'Unknown location error';
            break;
    }
    
    console.warn('Location error:', message);
    
    if (error.code === error.PERMISSION_DENIED) {
        showNotification(message, 'error');
    }
}

function updateLocationStatus() {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusDot = document.querySelector('.status-dot');
    const shareBtn = document.getElementById('shareLocationBtn');
    const stopBtn = document.getElementById('stopSharingBtn');
    
    if (!statusIndicator || !statusDot || !shareBtn || !stopBtn) return;

    if (sharingActive) {
        statusDot.classList.remove('inactive');
        statusDot.classList.add('active');
        statusIndicator.querySelector('span:last-child').textContent = 'Location sharing active';
        
        shareBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
    } else {
        statusDot.classList.remove('active');
        statusDot.classList.add('inactive');
        statusIndicator.querySelector('span:last-child').textContent = 'Location sharing inactive';
        
        shareBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
    }
}

function updateLocationDisplay() {
    const currentLocationDiv = document.getElementById('currentLocation');
    
    if (!currentLocationDiv || !currentLocationData) return;

    const coordinates = formatCoordinates(
        currentLocationData.latitude,
        currentLocationData.longitude
    );

    currentLocationDiv.innerHTML = `
        <div class="location-details">
            <h4>Current Location</h4>
            <div class="location-item">
                <strong>Coordinates:</strong> ${coordinates}
            </div>
            <div class="location-item">
                <strong>Accuracy:</strong> ±${Math.round(currentLocationData.accuracy)}m
            </div>
            <div class="location-item">
                <strong>Last Updated:</strong> ${formatDateTime(currentLocationData.timestamp)}
            </div>
            <div class="location-actions">
                <button class="btn btn-small btn-outline" onclick="copyLocationToClipboard()">
                    Copy Coordinates
                </button>
                <button class="btn btn-small btn-outline" onclick="openInMaps()">
                    Open in Maps
                </button>
            </div>
        </div>
    `;
}

function saveLocationUpdate(locationData) {
    // Save to location updates
    const updates = getFromStorage('locationUpdates') || [];
    updates.unshift({...locationData});
    
    // Keep only last 50 updates
    if (updates.length > 50) {
        updates.splice(50);
    }
    
    saveToStorage('locationUpdates', updates);

    // Also save to main alerts feed if sharing just started
    if (locationData.sharing) {
        const alerts = getFromStorage('alerts') || [];
        const existingAlert = alerts.find(alert => 
            alert.type === 'location' && 
            alert.sessionId === locationData.id
        );
        
        if (!existingAlert) {
            alerts.unshift({
                id: generateId(),
                type: 'location',
                sessionId: locationData.id,
                coordinates: formatCoordinates(locationData.latitude, locationData.longitude),
                timestamp: locationData.timestamp,
                action: 'started_sharing'
            });
            saveToStorage('alerts', alerts);
        }
    }
}

function loadWatchGroups() {
    const groups = getFromStorage('watchGroups') || [];
    const groupsList = document.getElementById('watchGroups');
    
    if (!groupsList) return;

    if (groups.length === 0) {
        groupsList.innerHTML = `
            <div class="empty-state">
                <p>No neighborhood watch groups configured.</p>
                <p>Contact your local community organization to join watch groups.</p>
            </div>
        `;
        return;
    }

    groupsList.innerHTML = groups.map(group => `
        <div class="group-item">
            <div class="group-info">
                <strong>${group.name}</strong>
                <br>
                <small>${group.area} • ${group.memberCount} members</small>
            </div>
            <div class="group-status">
                <span class="status-badge ${group.active ? 'active' : 'inactive'}">
                    ${group.active ? 'Active' : 'Inactive'}
                </span>
            </div>
        </div>
    `).join('');
}

function initializeDefaultWatchGroups() {
    const existingGroups = getFromStorage('watchGroups');
    
    if (!existingGroups || existingGroups.length === 0) {
        const defaultGroups = [
            {
                id: generateId(),
                name: 'Neighborhood Watch - Zone A',
                area: 'Central District',
                memberCount: 24,
                active: true,
                contactNumber: '+27 11 123 4567'
            },
            {
                id: generateId(),
                name: 'Community Patrol - East',
                area: 'Eastern Suburbs',
                memberCount: 18,
                active: true,
                contactNumber: '+27 11 234 5678'
            },
            {
                id: generateId(),
                name: 'Safety Network - West',
                area: 'Western District',
                memberCount: 31,
                active: false,
                contactNumber: '+27 11 345 6789'
            }
        ];
        
        saveToStorage('watchGroups', defaultGroups);
        loadWatchGroups();
    }
}

function notifyWatchGroups(action) {
    const groups = getFromStorage('watchGroups') || [];
    const activeGroups = groups.filter(group => group.active);
    
    activeGroups.forEach(group => {
        console.log(`📍 Location update sent to ${group.name}:`);
        console.log(`Member ${action} at ${formatDateTime(new Date())}`);
        if (currentLocationData) {
            console.log(`Location: ${formatCoordinates(currentLocationData.latitude, currentLocationData.longitude)}`);
        }
    });
}

// Make functions globally available
window.copyLocationToClipboard = async function() {
    if (!currentLocationData) return;
    
    const coordinates = formatCoordinates(
        currentLocationData.latitude,
        currentLocationData.longitude
    );
    
    try {
        await navigator.clipboard.writeText(coordinates);
        showNotification('Coordinates copied to clipboard!', 'success');
    } catch (error) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = coordinates;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Coordinates copied to clipboard!', 'success');
    }
};

window.openInMaps = function() {
    if (!currentLocationData) return;
    
    const url = `https://www.google.com/maps?q=${currentLocationData.latitude},${currentLocationData.longitude}`;
    window.open(url, '_blank');
};

// Get location sharing status
export function getLocationSharingStatus() {
    return {
        active: sharingActive,
        currentLocation: currentLocationData
    };
}

// Get recent location updates
export function getRecentLocationUpdates() {
    const updates = getFromStorage('locationUpdates') || [];
    return updates.slice(0, 10); // Last 10 updates
}
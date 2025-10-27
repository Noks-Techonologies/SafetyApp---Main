import { formatDateTime } from './main.js';

// Storage utility functions
export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error('Failed to save to storage:', error);
        return false;
    }
}

export function getFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to read from storage:', error);
        return null;
    }
}

export function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        console.error('Failed to remove from storage:', error);
        return false;
    }
}

export function clearAllStorage() {
    try {
        localStorage.clear();
        return true;
    } catch (error) {
        console.error('Failed to clear storage:', error);
        return false;
    }
}

// Initialize demo data if storage is empty
export function initializeDemoData() {
    const alerts = getFromStorage('alerts');
    
    if (!alerts || alerts.length === 0) {
        const demoAlerts = [
            {
                id: 'demo-1',
                type: 'report',
                activityType: 'suspicious-vehicle',
                location: 'Corner of Main St & Oak Ave',
                time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                description: 'White sedan parked outside residential area for extended period. Driver seemed to be watching nearby houses.',
                anonymous: false,
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                status: 'processed'
            },
            {
                id: 'demo-2',
                type: 'sos',
                location: {
                    latitude: -26.2041,
                    longitude: 28.0473
                },
                contacts: [
                    { name: 'Emergency Services', phone: '10111' },
                    { name: 'Family Member', phone: '+27 82 123 4567' }
                ],
                timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
                status: 'sent'
            },
            {
                id: 'demo-3',
                type: 'report',
                activityType: 'noise-disturbance',
                location: 'Residential Complex Block B',
                time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
                description: 'Loud music and shouting coming from apartment. Disrupting sleep of nearby residents.',
                anonymous: true,
                timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                status: 'submitted'
            },
            {
                id: 'demo-4',
                type: 'location',
                coordinates: '-26.2041, 28.0473',
                timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
                action: 'started_sharing'
            },
            {
                id: 'demo-5',
                type: 'report',
                activityType: 'trespassing',
                location: 'Behind Shopping Center',
                time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
                description: 'Individual seen jumping over fence into restricted area after closing hours.',
                anonymous: false,
                timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                status: 'processed'
            },
            {
                id: 'demo-6',
                type: 'tracker',
                childname: 'John Doe',
                simNumber: '+27 82 123 4567',
                phoneId: 'PHONE12345',
                location: {
                    latitude: -26.2041,
                    longitude: 28.0473,
                },
                timestamp: new Date(Date.now()-30*60*1000).toISOString(), //30 minutes ago
                action: 'location_update'
            },
        ];
        
        saveToStorage('alerts', demoAlerts);
        
        // Also save reports separately
        const reports = demoAlerts.filter(alert => alert.type === 'report');
        saveToStorage('reports', reports);
    }
}

// Load recent activity for dashboard
export function loadRecentActivity() {
    const recentItems = document.getElementById('recent-items');
    if (!recentItems) return;

    const alerts = getFromStorage('alerts') || [];
    const recentAlerts = alerts.slice(0, 5); // Show last 5 items

    if (recentAlerts.length === 0) {
        recentItems.innerHTML = `
            <div class="empty-state">
                <p>No recent activity to display.</p>
                <p>Community alerts and reports will appear here.</p>
            </div>
        `;
        return;
    }

    recentItems.innerHTML = recentAlerts.map(alert => {
        const icon = getAlertIcon(alert.type);
        const title = getAlertTitle(alert);
        const time = getTimeAgo(alert.timestamp);
        
        return `
            <div class="activity-item">
                <div class="activity-icon ${alert.type}">
                    ${icon}
                </div>
                <div class="activity-content">
                    <div class="activity-title">${title}</div>
                    <div class="activity-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getAlertIcon(type) {
    switch (type) {
        case 'sos': return '🚨';
        case 'report': return '👁️';
        case 'location': return '📍';
        case 'tracker': return '📡';
        default: return '📢';
    }
}

function getAlertTitle(alert) {
    switch (alert.type) {
        case 'sos':
            return 'Emergency SOS Alert Sent';
        case 'report':
            const activityTypes = {
                'suspicious-person': 'Suspicious Person',
                'suspicious-vehicle': 'Suspicious Vehicle',
                'noise-disturbance': 'Noise Disturbance',
                'trespassing': 'Trespassing',
                'vandalism': 'Vandalism',
                'other': 'Other'
            };
            return `Report: ${activityTypes[alert.activityType] || alert.activityType}`;
        case 'location':
            return 'Location Sharing Update';
        case 'tracker':
            return 'location Tracker update';
        default:
            return 'Community Alert';
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
    }
}

// Storage statistics
export function getStorageStats() {
    const alerts = getFromStorage('alerts') || [];
    const reports = getFromStorage('reports') || [];
    const locationUpdates = getFromStorage('locationUpdates') || [];
    const emergencyContacts = getFromStorage('emergencyContacts') || [];
    const trackers = getFromStorage('trackers') || [];
    
    return {
        totalAlerts: alerts.length,
        totalReports: reports.length,
        totalLocationUpdates: locationUpdates.length,
        totalEmergencyContacts: emergencyContacts.length,
        totalTrackers: trackers.length,
        storageUsed: calculateStorageUsage()
    };
}

function calculateStorageUsage() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length;
        }
    }
    return totalSize;
}

// Initialize demo data on first load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeDemoData();
    }, 500);
});
import { formatDateTime, formatTime } from './main.js';
import { getFromStorage } from './storage.js';
import { getActivityTypeDisplay } from './reports.js';

let currentFilter = 'all';

export function initFeed() {
    setupFeedFilters();
    loadFeedData();
}

function setupFeedFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update current filter
            currentFilter = this.dataset.filter;
            
            // Reload feed data
            loadFeedData();
        });
    });
}

function loadFeedData() {
    const alerts = getFromStorage('alerts') || [];
    const feedContainer = document.getElementById('communityFeed');
    
    if (!feedContainer) return;

    // Filter alerts based on current filter
    let filteredAlerts = alerts;
    
    if (currentFilter !== 'all') {
        filteredAlerts = alerts.filter(alert => {
            if (currentFilter === 'sos') return alert.type === 'sos';
            if (currentFilter === 'reports') return alert.type === 'report';
            if (currentFilter === 'location') return alert.type === 'location';
            return true;
        });
    }

    if (filteredAlerts.length === 0) {
        feedContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📢</div>
                <h3>No ${currentFilter === 'all' ? 'community activity' : currentFilter} found</h3>
                <p>When community members send alerts or reports, they will appear here.</p>
            </div>
        `;
        return;
    }

    feedContainer.innerHTML = filteredAlerts.map(alert => 
        renderFeedItem(alert)
    ).join('');
}

function renderFeedItem(alert) {
    const timeAgo = getTimeAgo(alert.timestamp);
    
    switch (alert.type) {
        case 'sos':
            return renderSOSAlert(alert, timeAgo);
        case 'report':
            return renderReportAlert(alert, timeAgo);
        case 'location':
            return renderLocationAlert(alert, timeAgo);
        default:
            return renderGenericAlert(alert, timeAgo);
    }
}

function renderSOSAlert(alert, timeAgo) {
    const location = alert.location ? 
        `📍 ${alert.location.latitude.toFixed(4)}, ${alert.location.longitude.toFixed(4)}` : 
        '📍 Location unavailable';
    
    return `
        <div class="feed-item sos">
            <div class="feed-header">
                <div>
                    <div class="feed-title">🚨 Emergency SOS Alert</div>
                    <div class="feed-time">${timeAgo}</div>
                </div>
                <div class="alert-priority priority-high">HIGH PRIORITY</div>
            </div>
            <div class="feed-content">
                <p><strong>Emergency alert sent to ${alert.contacts ? alert.contacts.length : 0} contacts</strong></p>
                <p>${location}</p>
                <p>Status: <span class="status-badge success">Sent Successfully</span></p>
            </div>
            <div class="feed-meta">
                <span>📱 Emergency</span>
                <span>⏰ ${formatTime(alert.timestamp)}</span>
            </div>
        </div>
    `;
}

function renderReportAlert(alert, timeAgo) {
    const activityType = getActivityTypeDisplay(alert.activityType);
    
    return `
        <div class="feed-item report">
            <div class="feed-header">
                <div>
                    <div class="feed-title">👁️ Suspicious Activity Report</div>
                    <div class="feed-time">${timeAgo}</div>
                </div>
            </div>
            <div class="feed-content">
                <p><strong>${activityType}</strong></p>
                <p>📍 ${alert.location}</p>
                <p>🕒 ${formatDateTime(alert.time)}</p>
                <p>${alert.description}</p>
                ${alert.anonymous ? '<p><em>Reported anonymously</em></p>' : ''}
            </div>
            <div class="feed-meta">
                <span>📋 Report</span>
                <span>⏰ ${formatTime(alert.timestamp)}</span>
                <span>${alert.status || 'Submitted'}</span>
            </div>
        </div>
    `;
}

function renderLocationAlert(alert, timeAgo) {
    return `
        <div class="feed-item location">
            <div class="feed-header">
                <div>
                    <div class="feed-title">📍 Location Sharing Update</div>
                    <div class="feed-time">${timeAgo}</div>
                </div>
            </div>
            <div class="feed-content">
                <p><strong>Community member ${alert.action === 'started_sharing' ? 'started' : 'stopped'} sharing location</strong></p>
                ${alert.coordinates ? `<p>📍 ${alert.coordinates}</p>` : ''}
            </div>
            <div class="feed-meta">
                <span>🗺️ Location</span>
                <span>⏰ ${formatTime(alert.timestamp)}</span>
            </div>
        </div>
    `;
}

function renderGenericAlert(alert, timeAgo) {
    return `
        <div class="feed-item">
            <div class="feed-header">
                <div>
                    <div class="feed-title">📢 Community Alert</div>
                    <div class="feed-time">${timeAgo}</div>
                </div>
            </div>
            <div class="feed-content">
                <p>New community activity detected</p>
                <pre>${JSON.stringify(alert, null, 2)}</pre>
            </div>
            <div class="feed-meta">
                <span>ℹ️ General</span>
                <span>⏰ ${formatTime(alert.timestamp)}</span>
            </div>
        </div>
    `;
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
        return formatDateTime(timestamp);
    }
}

// Get feed statistics
export function getFeedStats() {
    const alerts = getFromStorage('alerts') || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAlerts = alerts.filter(alert => 
        new Date(alert.timestamp) >= today
    );
    
    const stats = {
        total: alerts.length,
        today: todayAlerts.length,
        sos: alerts.filter(a => a.type === 'sos').length,
        reports: alerts.filter(a => a.type === 'report').length,
        location: alerts.filter(a => a.type === 'location').length
    };
    
    return stats;
}

// Export for external use
export function refreshFeed() {
    loadFeedData();
}
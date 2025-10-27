// Import all modules
import { initSOS } from './sos.js';
import { initReports } from './reports.js';
import { initLocation } from './location.js';
import { initFeed } from './feed.js';
import { initTracker } from './tracker.js';
import { loadRecentActivity } from './storage.js';
import { authAPI, userAPI } from './api.js';

// Global variables
let currentSection = 'dashboard';
let currentUser = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    initNavigation();
    initSOS();
    initReports();
    initLocation();
    initFeed();
    initTracker();
    loadRecentActivity();
    initMobileMenu();
    initUserProfile();
});

// Check if user is authenticated
async function checkAuthentication() {
    if (authAPI.isLoggedIn()) {
        currentUser = authAPI.getCurrentUser();
        updateUIForAuthenticatedUser();
        
        // Refresh user data from backend
        try {
            const response = await authAPI.getMe();
            if (response.success) {
                currentUser = response.data.user;
                updateUIForAuthenticatedUser();
            }
        } catch (error) {
            console.error('Failed to fetch user data:', error);
        }
    } else {
        updateUIForGuestUser();
    }
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
    // Update login/signin buttons to show profile
    const navButtonsLeft = document.querySelector('.navbar-buttons-left');
    if (navButtonsLeft && currentUser) {
        navButtonsLeft.innerHTML = `
            <div class="user-info">
                <span>Welcome, ${currentUser.name}!</span>
                <button class="btn btn-light-outline" onclick="viewProfile()">Profile</button>
                <button class="btn btn-dark-outline" onclick="logout()">Logout</button>
            </div>
        `;
    }

    // Update profile card in dashboard
    const profileCard = document.querySelector('.dashboard-card:has(h3:contains("Profile"))');
    if (profileCard) {
        profileCard.innerHTML = `
            <div class="card-icon">👤</div>
            <h3>Profile</h3>
            <p>Welcome back, ${currentUser.name}!</p>
            <p style="font-size: 0.9em; color: #666;">${currentUser.email}</p>
            <button class="btn btn-primary" onclick="viewProfile()">View Profile</button>
            <button class="btn btn-secondary" onclick="logout()">Logout</button>
        `;
    }
}

// Update UI for guest user
function updateUIForGuestUser() {
    const navButtonsLeft = document.querySelector('.navbar-buttons-left');
    if (navButtonsLeft) {
        navButtonsLeft.innerHTML = `
            <a href="login.html"><button class="btn btn-light-outline">Log-in</button></a>
            <a href="signin.html"><button class="btn btn-dark-outline">Sign-in</button></a>
        `;
    }
}

// Initialize user profile section
function initUserProfile() {
    // Create profile section if it doesn't exist
    const main = document.querySelector('.main .container');
    if (main && !document.getElementById('profile')) {
        const profileSection = document.createElement('section');
        profileSection.id = 'profile';
        profileSection.className = 'section';
        profileSection.innerHTML = `
            <div class="section-header">
                <h2>My Profile</h2>
                <p>Manage your account settings</p>
            </div>

            <div class="profile-container">
                <div class="profile-info">
                    <h3>Account Information</h3>
                    <div id="profileData">
                        <p><strong>Name:</strong> <span id="profileName">${currentUser?.name || 'N/A'}</span></p>
                        <p><strong>Email:</strong> <span id="profileEmail">${currentUser?.email || 'N/A'}</span></p>
                        <p><strong>Role:</strong> <span id="profileRole">${currentUser?.role || 'user'}</span></p>
                        <p><strong>Member since:</strong> <span id="profileCreated">${currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A'}</span></p>
                    </div>
                    <button class="btn btn-primary" onclick="editProfile()">Edit Profile</button>
                    <button class="btn btn-secondary" onclick="showChangePassword()">Change Password</button>
                </div>

                <div id="editProfileForm" style="display: none;">
                    <h3>Edit Profile</h3>
                    <form id="updateProfileForm">
                        <div class="form-group">
                            <label for="editName">Name:</label>
                            <input type="text" id="editName" value="${currentUser?.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmail">Email:</label>
                            <input type="email" id="editEmail" value="${currentUser?.email || ''}" required>
                        </div>
                        <div id="profileError" style="display: none; color: red; margin: 10px 0;"></div>
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelEditProfile()">Cancel</button>
                    </form>
                </div>

                <div id="changePasswordForm" style="display: none;">
                    <h3>Change Password</h3>
                    <form id="updatePasswordForm">
                        <div class="form-group">
                            <label for="currentPassword">Current Password:</label>
                            <input type="password" id="currentPassword" required>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">New Password:</label>
                            <input type="password" id="newPassword" minlength="6" required>
                        </div>
                        <div class="form-group">
                            <label for="confirmNewPassword">Confirm New Password:</label>
                            <input type="password" id="confirmNewPassword" minlength="6" required>
                        </div>
                        <div id="passwordError" style="display: none; color: red; margin: 10px 0;"></div>
                        <button type="submit" class="btn btn-primary">Update Password</button>
                        <button type="button" class="btn btn-secondary" onclick="cancelChangePassword()">Cancel</button>
                    </form>
                </div>
            </div>
        `;
        main.appendChild(profileSection);

        // Add profile form handlers
        setupProfileFormHandlers();
    }
}

// Setup profile form handlers
function setupProfileFormHandlers() {
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('editName').value;
            const email = document.getElementById('editEmail').value;
            const errorDiv = document.getElementById('profileError');

            try {
                const response = await userAPI.updateProfile(name, email);
                if (response.success) {
                    currentUser = response.data.user;
                    updateUIForAuthenticatedUser();
                    showNotification('Profile updated successfully!', 'success');
                    cancelEditProfile();
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    }

    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            const errorDiv = document.getElementById('passwordError');

            if (newPassword !== confirmNewPassword) {
                errorDiv.textContent = 'Passwords do not match';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                const response = await userAPI.changePassword(currentPassword, newPassword);
                if (response.success) {
                    showNotification('Password changed successfully! Please login again.', 'success');
                    setTimeout(() => logout(), 2000);
                }
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.style.display = 'block';
            }
        });
    }
}

// Profile management functions
window.viewProfile = function() {
    if (!authAPI.isLoggedIn()) {
        window.location.href = '/login.html';
        return;
    }
    showSection('profile');
};

window.editProfile = function() {
    document.querySelector('.profile-info').style.display = 'none';
    document.getElementById('editProfileForm').style.display = 'block';
    document.getElementById('changePasswordForm').style.display = 'none';
};

window.cancelEditProfile = function() {
    document.querySelector('.profile-info').style.display = 'block';
    document.getElementById('editProfileForm').style.display = 'none';
    document.getElementById('profileError').style.display = 'none';
};

window.showChangePassword = function() {
    document.querySelector('.profile-info').style.display = 'none';
    document.getElementById('editProfileForm').style.display = 'none';
    document.getElementById('changePasswordForm').style.display = 'block';
};

window.cancelChangePassword = function() {
    document.querySelector('.profile-info').style.display = 'block';
    document.getElementById('changePasswordForm').style.display = 'none';
    document.getElementById('passwordError').style.display = 'none';
};

window.logout = async function() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
            // Clear tokens anyway and redirect
            authAPI.logout();
        }
    }
};

// Navigation functionality
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.dataset.section;
            showSection(sectionId);
        });
    });

    // Make showSection globally available
    window.showSection = function(sectionId) {
        // Hide all sections
        sections.forEach(section => {
            section.classList.remove('active');
        });

        // Remove active class from all nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Show the selected section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            currentSection = sectionId;

            // Add active class to corresponding nav link
            const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Close mobile menu if open
            const nav = document.querySelector('.nav');
            if (nav) {
                nav.classList.remove('active');
            }

            // Update page title
            updatePageTitle(sectionId);

            // Trigger section-specific initialization
            if (sectionId === 'feed') {
                initFeed();
            } else if (sectionId === 'dashboard') {
                loadRecentActivity();
            } else if (sectionId === 'tracker'){
                initTracker();
            }
        }
    };
}

// Mobile menu functionality
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!menuToggle.contains(e.target) && !nav.contains(e.target)) {
                nav.classList.remove('active');
            }
        });
    }
}

// Update page title based on current section
function updatePageTitle(sectionId) {
    const titles = {
        dashboard: 'Community Alert - Safety Dashboard',
        sos: 'Community Alert - Emergency SOS',
        reports: 'Community Alert - Report Activity',
        location: 'Community Alert - Share Location',
        feed: 'Community Alert - Community Feed',
        tracker: 'Community Alert - Location Tracker',
        profile: 'Community Alert - My Profile',
    };

    document.title = titles[sectionId] || 'Community Alert - Safety & Security';
}

// Notification system
export function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageElement = notification.querySelector('.notification-message');
    const closeButton = notification.querySelector('.notification-close');

    messageElement.textContent = message;
    
    // Remove existing type classes
    notification.classList.remove('success', 'error', 'warning');
    notification.classList.add(type);

    // Show notification
    notification.classList.add('show');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);

    // Close button functionality
    closeButton.onclick = () => {
        notification.classList.remove('show');
    };
}

// Utility functions
export function formatDateTime(date) {
    return new Date(date).toLocaleString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatTime(date) {
    return new Date(date).toLocaleString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Geolocation utility
export function getCurrentLocationCoords() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by this browser'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            error => {
                let message;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message = 'Location access denied by user';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        message = 'Location request timed out';
                        break;
                    default:
                        message = 'An unknown error occurred';
                        break;
                }
                reject(new Error(message));
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes
            }
        );
    });
}

// Format coordinates for display
export function formatCoordinates(latitude, longitude) {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    if (distance < 1) {
        return `${Math.round(distance * 1000)}m`;
    } else {
        return `${distance.toFixed(1)}km`;
    }
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('Application error:', e.error);
    showNotification('An unexpected error occurred. Please try again.', 'error');
});

// Service worker registration (for future PWA support)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Service worker would be registered here in a real application
        console.log('Service worker support detected');
    });
}

// Export current user for other modules
export function getCurrentUser() {
    return currentUser;
}
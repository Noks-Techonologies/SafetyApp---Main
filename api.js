// API Service - Handles all backend communication
const API_URL = 'https://safe-app-backend-p8rf.onrender.com://localhost:5000/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('authToken');
const getRefreshToken = () => localStorage.getItem('refreshToken');

// Save tokens to localStorage
const saveTokens = (token, refreshToken) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('refreshToken', refreshToken);
};

// Remove tokens from localStorage
const clearTokens = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

// Save user data to localStorage
const saveUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

// Get user data from localStorage
const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Make API request with authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add token to headers if available
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    const data = await response.json();

    // Handle token expiration
    if (response.status === 401 && data.message === 'Token expired') {
      // Try to refresh token
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the original request
        config.headers['Authorization'] = `Bearer ${getToken()}`;
        const retryResponse = await fetch(`${API_URL}${endpoint}`, config);
        return await retryResponse.json();
      } else {
        // Refresh failed, redirect to login
        clearTokens();
        window.location.href = '/login.html';
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Refresh access token
const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      saveTokens(data.data.token, data.data.refreshToken);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token refresh error:', error);
    return false;
  }
};

// Auth API calls
export const authAPI = {
  // Register new user
  register: async (name, email, password) => {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    if (data.success) {
      saveTokens(data.data.token, data.data.refreshToken);
      saveUser(data.data.user);
    }

    return data;
  },

  // Login user
  login: async (email, password) => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.success) {
      saveTokens(data.data.token, data.data.refreshToken);
      saveUser(data.data.user);
    }

    return data;
  },

  // Logout user
  logout: async () => {
    const refreshToken = getRefreshToken();
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      clearTokens();
      window.location.href = '/login.html';
    }
  },

  // Get current user
  getMe: async () => {
    return await apiRequest('/auth/me');
  },

  // Check if user is logged in
  isLoggedIn: () => {
    return !!getToken();
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    return getUser();
  },
};

// User API calls
export const userAPI = {
  // Update user profile
  updateProfile: async (name, email) => {
    const data = await apiRequest('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    });

    if (data.success) {
      saveUser(data.data.user);
    }

    return data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return await apiRequest('/users/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Get all users (Admin only)
  getAllUsers: async (page = 1, limit = 10) => {
    return await apiRequest(`/users?page=${page}&limit=${limit}`);
  },
};

// Tracker API calls
export const trackerAPI = {
  // Create new tracker
  createTracker: async (childName, contactNumber, deviceId) => {
    return await apiRequest('/tracker', {
      method: 'POST',
      body: JSON.stringify({ childName, contactNumber, deviceId }),
    });
  },

  // Get all trackers
  getTrackers: async () => {
    return await apiRequest('/tracker');
  },

  // Get single tracker
  getTracker: async (id) => {
    return await apiRequest(`/tracker/${id}`);
  },

  // Update location
  updateLocation: async (id, latitude, longitude, accuracy, address) => {
    return await apiRequest(`/tracker/${id}/location`, {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude, accuracy, address }),
    });
  },

  // Get location history
  getLocationHistory: async (id, limit = 50) => {
    return await apiRequest(`/tracker/${id}/history?limit=${limit}`);
  },

  // Toggle tracker
  toggleTracker: async (id) => {
    return await apiRequest(`/tracker/${id}/toggle`, {
      method: 'PUT',
    });
  },

  // Delete tracker
  deleteTracker: async (id) => {
    return await apiRequest(`/tracker/${id}`, {
      method: 'DELETE',
    });
  },
};

// Location API calls
export const locationAPI = {
  // Start sharing location
  startSharing: async (latitude, longitude, accuracy, address, sharedWith, duration) => {
    return await apiRequest('/location/share', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, accuracy, address, sharedWith, duration }),
    });
  },

  // Update location
  updateLocation: async (latitude, longitude, accuracy, address) => {
    return await apiRequest('/location/update', {
      method: 'PUT',
      body: JSON.stringify({ latitude, longitude, accuracy, address }),
    });
  },

  // Stop sharing
  stopSharing: async () => {
    return await apiRequest('/location/stop', {
      method: 'POST',
    });
  },

  // Get my location
  getMyLocation: async () => {
    return await apiRequest('/location/my-location');
  },

  // Get nearby locations
  getNearbyLocations: async (latitude, longitude, radius) => {
    return await apiRequest(`/location/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius || 5}`);
  },

  // Get history
  getLocationHistory: async (limit) => {
    return await apiRequest(`/location/history?limit=${limit || 20}`);
  },
};

// Reports API calls
export const reportsAPI = {
  // Create report
  createReport: async (type, location, incidentTime, description, isAnonymous, visibility) => {
    return await apiRequest('/reports', {
      method: 'POST',
      body: JSON.stringify({ type, location, incidentTime, description, isAnonymous, visibility }),
    });
  },

  // Get all reports
  getReports: async (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return await apiRequest(`/reports?${params}`);
  },

  // Get single report
  getReport: async (id) => {
    return await apiRequest(`/reports/${id}`);
  },

  // Get my reports
  getMyReports: async () => {
    return await apiRequest('/reports/my-reports');
  },

  // Update report
  updateReport: async (id, data) => {
    return await apiRequest(`/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete report
  deleteReport: async (id) => {
    return await apiRequest(`/reports/${id}`, {
      method: 'DELETE',
    });
  },

  // Get statistics
  getStats: async () => {
    return await apiRequest('/reports/stats');
  },
};

// Export utility functions
export const utils = {
  getToken,
  getUser,
  clearTokens,
  isLoggedIn: authAPI.isLoggedIn,
};
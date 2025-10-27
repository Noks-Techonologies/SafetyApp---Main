import { reportsAPI } from './api.js';
import { showNotification, getCurrentLocationCoords } from './main.js';

export function initReports() {
  const reportForm = document.getElementById('reportForm');
  
  if (reportForm) {
    reportForm.addEventListener('submit', handleReportSubmit);
  }
  
  // Set default incident time to now
  const timeInput = document.getElementById('reportTime');
  if (timeInput) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    timeInput.value = now.toISOString().slice(0, 16);
  }
}

async function handleReportSubmit(e) {
  e.preventDefault();
  
  const type = document.getElementById('reportType').value;
  const locationInput = document.getElementById('reportLocation').value;
  const incidentTime = document.getElementById('reportTime').value;
  const description = document.getElementById('reportDescription').value;
  const isAnonymous = document.getElementById('reportAnonymous').checked;
  
  if (!type || !locationInput || !incidentTime || !description) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  try {
    showNotification('Submitting report...', 'info');
    
    // Get current coordinates if available
    let coordinates = null;
    try {
      const coords = await getCurrentLocationCoords();
      coordinates = {
        latitude: coords.latitude,
        longitude: coords.longitude,
      };
    } catch (err) {
      console.log('Could not get coordinates:', err);
    }
    
    // Prepare location data
    const location = {
      address: locationInput,
      coordinates: coordinates,
    };
    
    // Submit report
    const response = await reportsAPI.createReport(
      type,
      location,
      incidentTime,
      description,
      isAnonymous,
      'public'
    );
    
    if (response.success) {
      showNotification('Report submitted successfully!', 'success');
      
      // Reset form
      e.target.reset();
      
      // Set time to now again
      const timeInput = document.getElementById('reportTime');
      if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        timeInput.value = now.toISOString().slice(0, 16);
      }
      
      // Save to local storage for recent activity
      saveReportToStorage(response.data.report);
    }
  } catch (error) {
    console.error('Submit report error:', error);
    showNotification(error.message || 'Failed to submit report', 'error');
  }
}

function saveReportToStorage(report) {
  try {
    // Get existing recent activity
    const recentActivity = JSON.parse(localStorage.getItem('recentActivity') || '[]');
    
    // Add new report
    recentActivity.unshift({
      id: report._id,
      type: 'report',
      title: `Report: ${formatReportType(report.type)}`,
      description: report.description.substring(0, 100) + '...',
      location: report.location.address,
      timestamp: report.createdAt,
    });
    
    // Keep only last 10 items
    if (recentActivity.length > 10) {
      recentActivity.pop();
    }
    
    // Save back to storage
    localStorage.setItem('recentActivity', JSON.stringify(recentActivity));
    
    // Trigger event to update dashboard
    window.dispatchEvent(new Event('activityUpdated'));
  } catch (error) {
    console.error('Error saving to storage:', error);
  }
}

function formatReportType(type) {
  const types = {
    'suspicious-person': 'Suspicious Person',
    'suspicious-vehicle': 'Suspicious Vehicle',
    'noise-disturbance': 'Noise Disturbance',
    'trespassing': 'Trespassing',
    'vandalism': 'Vandalism',
    'other': 'Other',
  };
  return types[type] || type;
}

// Function to get current location for report
window.getCurrentLocation = async function(context) {
  try {
    showNotification('Getting your location...', 'info');
    
    const coords = await getCurrentLocationCoords();
    
    // Reverse geocode to get address
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`
    );
    const data = await response.json();
    
    if (context === 'report') {
      const locationInput = document.getElementById('reportLocation');
      if (locationInput) {
        locationInput.value = data.display_name || `${coords.latitude}, ${coords.longitude}`;
      }
    }
    
    showNotification('Location obtained!', 'success');
  } catch (error) {
    console.error('Get location error:', error);
    showNotification('Could not get location: ' + error.message, 'error');
  }
};

// Load and display user's reports
export async function loadMyReports() {
  try {
    const response = await reportsAPI.getMyReports();
    
    if (response.success) {
      displayMyReports(response.data.reports);
    }
  } catch (error) {
    console.error('Load my reports error:', error);
  }
}

function displayMyReports(reports) {
  const container = document.getElementById('myReportsContainer');
  
  if (!container) return;
  
  if (reports.length === 0) {
    container.innerHTML = '<p>You haven\'t submitted any reports yet.</p>';
    return;
  }
  
  container.innerHTML = `
    <h3>Your Reports (${reports.length})</h3>
    <div class="reports-list">
      ${reports.map(report => `
        <div class="report-item" style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid ${getStatusColor(report.status)};">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h4>${formatReportType(report.type)}</h4>
              <p><strong>Status:</strong> <span style="color: ${getStatusColor(report.status)}">${report.status.toUpperCase()}</span></p>
              <p><strong>Location:</strong> ${report.location.address}</p>
              <p><strong>Time:</strong> ${new Date(report.incidentTime).toLocaleString()}</p>
              <p><strong>Description:</strong> ${report.description}</p>
              <p style="color: #777; font-size: 12px;">Submitted: ${new Date(report.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <button onclick="deleteReport('${report._id}')" class="btn btn-small" style="background: #dc3545; color: white;">Delete</button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getStatusColor(status) {
  const colors = {
    'pending': '#ffc107',
    'under-review': '#17a2b8',
    'resolved': '#28a745',
    'dismissed': '#6c757d',
  };
  return colors[status] || '#6c757d';
}
// Export function for other modules
export function getActivityTypeDisplay(type) {
  return formatReportType(type);
}

// Delete report
window.deleteReport = async function(reportId) {
  if (!confirm('Are you sure you want to delete this report?')) {
    return;
  }
  
  try {
    const response = await reportsAPI.deleteReport(reportId);
    
    if (response.success) {
      showNotification('Report deleted successfully', 'success');
      loadMyReports(); // Reload reports
    }
  } catch (error) {
    showNotification('Failed to delete report', 'error');
  }
};
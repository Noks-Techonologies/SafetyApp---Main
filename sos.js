import { showNotification, formatDateTime, generateId } from './main.js';
import { saveToStorage, getFromStorage } from './storage.js';

let sosActive = false;
let sosTimer = null;

export function initSOS() {
    const sosButton = document.getElementById('sosButton');
    const sosStatus = document.getElementById('sosStatus');
    
    if (sosButton) {
        sosButton.addEventListener('click', triggerSOS);
    }
    
    loadEmergencyContacts();
    setupEmergencyContactForm();
}

function triggerSOS() {
    if (sosActive) {
        showNotification('SOS alert already active!', 'warning');
        return;
    }

    const contacts = getFromStorage('emergencyContacts') || [];
    
    if (contacts.length === 0) {
        showNotification('Please add emergency contacts before sending SOS!', 'error');
        return;
    }

    sosActive = true;
    const sosId = generateId();
    const timestamp = new Date().toISOString();

    // Get current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                sendSOSAlert(sosId, timestamp, location, contacts);
            },
            () => {
                // Send SOS without location if geolocation fails
                sendSOSAlert(sosId, timestamp, null, contacts);
            }
        );
    } else {
        sendSOSAlert(sosId, timestamp, null, contacts);
    }
}

function sendSOSAlert(sosId, timestamp, location, contacts) {
    // Create SOS alert record
    const sosAlert = {
        id: sosId,
        type: 'sos',
        timestamp: timestamp,
        location: location,
        contacts: contacts,
        status: 'sent'
    };

    // Save to storage
    const alerts = getFromStorage('alerts') || [];
    alerts.unshift(sosAlert);
    saveToStorage('alerts', alerts);

    // Update UI
    updateSOSStatus('SOS Alert Sent Successfully!', 'success');
    
    // Simulate sending to emergency contacts
    contacts.forEach(contact => {
        setTimeout(() => {
            simulateContactNotification(contact, location);
        }, Math.random() * 2000); // Random delay for realism
    });

    // Show success notification
    showNotification('🚨 SOS Alert sent to all emergency contacts!', 'success');

    // Reset after 30 seconds
    sosTimer = setTimeout(() => {
        resetSOS();
    }, 30000);
}

function simulateContactNotification(contact, location) {
    const locationText = location ? 
        `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 
        'Location: Not available';
    
    console.log(`📱 SMS sent to ${contact.name} (${contact.phone}):`);
    console.log(`🚨 EMERGENCY ALERT 🚨`);
    console.log(`This is an SOS alert from Community Alert.`);
    console.log(`Time: ${formatDateTime(new Date())}`);
    console.log(locationText);
    console.log(`Please check on this person immediately or contact emergency services.`);
}

function updateSOSStatus(message, type) {
    const sosStatus = document.getElementById('sosStatus');
    sosStatus.innerHTML = `
        <div class="alert alert-${type}">
            <strong>${message}</strong>
            <p>Emergency contacts have been notified.</p>
            <p>Timestamp: ${formatDateTime(new Date())}</p>
        </div>
    `;
}

function resetSOS() {
    sosActive = false;
    if (sosTimer) {
        clearTimeout(sosTimer);
        sosTimer = null;
    }
    
    const sosStatus = document.getElementById('sosStatus');
    sosStatus.innerHTML = '';
}

function loadEmergencyContacts() {
    const contacts = getFromStorage('emergencyContacts') || [];
    const contactsList = document.getElementById('emergencyContacts');
    
    if (!contactsList) return;

    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <p>No emergency contacts added yet.</p>
                <p>Add trusted contacts who will be notified during emergencies.</p>
            </div>
        `;
        return;
    }

    contactsList.innerHTML = contacts.map(contact => `
        <div class="contact-item">
            <div class="contact-info">
                <strong>${contact.name}</strong>
                <br>
                <span>${contact.phone}</span>
                ${contact.relationship ? `<br><small>${contact.relationship}</small>` : ''}
            </div>
            <button class="btn btn-small btn-outline" onclick="removeEmergencyContact('${contact.id}')">
               Remove
            </button>
        </div>
    `).join('');
}

function setupEmergencyContactForm() {
    // Make functions globally available
    window.addEmergencyContact = addEmergencyContact;
    window.removeEmergencyContact = removeEmergencyContact;
}

function addEmergencyContact() {
    const name = prompt('Enter contact name:');
    if (!name || name.trim() === '') return;

    const phone = prompt('Enter phone number:');
    if (!phone || phone.trim() === '') return;

    const relationship = prompt('Enter relationship (optional):') || '';

    const contact = {
        id: generateId(),
        name: name.trim(),
        phone: phone.trim(),
        relationship: relationship.trim(),
        dateAdded: new Date().toISOString()
    };

    const contacts = getFromStorage('emergencyContacts') || [];
    contacts.push(contact);
    saveToStorage('emergencyContacts', contacts);

    loadEmergencyContacts();
    showNotification(`Emergency contact "${name}" added successfully!`, 'success');
}

function removeEmergencyContact(contactId) {
    if (!confirm('Are you sure you want to remove this emergency contact?')) {
        return;
    }

    const contacts = getFromStorage('emergencyContacts') || [];
    const updatedContacts = contacts.filter(contact => contact.id !== contactId);
    
    saveToStorage('emergencyContacts', updatedContacts);
    loadEmergencyContacts();
    showNotification('Emergency contact removed successfully!', 'success');
}

// Initialize default emergency contacts if none exist
function initializeDefaultContacts() {
    const existingContacts = getFromStorage('emergencyContacts');
    
    if (!existingContacts || existingContacts.length === 0) {
        const defaultContacts = [
            {
                id: generateId(),
                name: 'Emergency Services',
                phone: '10111',
                relationship: 'Police',
                dateAdded: new Date().toISOString()
            },
            {
                id: generateId(),
                name: 'Medical Emergency',
                phone: '10177',
                relationship: 'Ambulance',
                dateAdded: new Date().toISOString()
            }
        ];
        
        saveToStorage('emergencyContacts', defaultContacts);
        loadEmergencyContacts();
    }
}

// Initialize default contacts on first load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeDefaultContacts, 1000);
});
// Debug script for farmer-order page
document.addEventListener('DOMContentLoaded', function() {
    // Create debug panel
    const debugPanel = document.createElement('div');
    debugPanel.style.position = 'fixed';
    debugPanel.style.top = '50px';
    debugPanel.style.right = '20px';
    debugPanel.style.background = 'rgba(0, 0, 0, 0.8)';
    debugPanel.style.color = '#00ff00';
    debugPanel.style.padding = '20px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.maxWidth = '400px';
    debugPanel.style.maxHeight = '400px';
    debugPanel.style.overflowY = 'auto';
    
    // Display localStorage items
    let html = '<h3>Debug Info:</h3>';
    html += '<p>Checking localStorage:</p><ul>';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        let value = localStorage.getItem(key);
        if (key === 'token') {
            // Don't show full token for security
            value = value.substring(0, 10) + '...';
        }
        html += `<li><strong>${key}:</strong> ${value}</li>`;
    }
    html += '</ul>';
    
    // Manual login fix option
    html += `<p>Fix Authentication:</p>
    <button id="fixAuth" style="background: #7dde83; color: black; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
        Set Role to Farmer
    </button>`;
    
    // Manual force login
    html += `<p>Force Login:</p>
    <button id="forceLogin" style="background: #7dde83; color: black; padding: 5px 10px; border-radius: 5px; cursor: pointer;">
        Skip Auth Check
    </button>`;
    
    debugPanel.innerHTML = html;
    document.body.appendChild(debugPanel);
    
    // Add event listeners
    document.getElementById('fixAuth').addEventListener('click', function() {
        localStorage.setItem('userRole', 'Farmer');
        alert('Role set to Farmer! Reloading page...');
        window.location.reload();
    });
    
    document.getElementById('forceLogin').addEventListener('click', function() {
        // Skip authentication check and run page initialization
        setupProfileDropdown();
        setupStatusFilter();
        fetchOrders();
    });
});
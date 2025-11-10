/**
 * Browser Navigation Handler
 * Provides feedback when users try to use browser forward/back buttons
 */

(function() {
    'use strict';
    
    let currentUrl = window.location.href;
    let showingMessage = false;
    
    // Function to show helpful message
    function showNavigationGuidance() {
        if (showingMessage) return;
        showingMessage = true;
        
        const existingMsg = document.getElementById('nav-guidance-msg');
        if (existingMsg) {
            existingMsg.remove();
        }
        
        const msgDiv = document.createElement('div');
        msgDiv.id = 'nav-guidance-msg';
        msgDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 300px;
            font-family: Arial, sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add CSS animation
        if (!document.getElementById('nav-guidance-styles')) {
            const styles = document.createElement('style');
            styles.id = 'nav-guidance-styles';
            styles.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        msgDiv.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <i class="fas fa-compass" style="font-size: 20px; margin-right: 10px; color: #ffd700;"></i>
                <div style="font-size: 16px; font-weight: bold;">
                    Navigation Tip
                </div>
            </div>
            <div style="font-size: 13px; line-height: 1.4; color: rgba(255,255,255,0.9);">
                Use the <strong>Back to Dashboard</strong> button or page links for better navigation experience.
            </div>
            <button onclick="this.parentElement.remove(); showingMessage = false;" 
                    style="position: absolute; top: 5px; right: 8px; background: none; border: none; color: white; font-size: 18px; cursor: pointer; opacity: 0.7;">
                ×
            </button>
        `;
        
        document.body.appendChild(msgDiv);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (msgDiv && msgDiv.parentElement) {
                msgDiv.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => {
                    if (msgDiv && msgDiv.parentElement) {
                        msgDiv.remove();
                    }
                    showingMessage = false;
                }, 300);
            }
        }, 4000);
    }
    
    // Monitor navigation attempts
    function setupNavigationMonitoring() {
        let navigationAttempts = 0;
        
        // Listen for popstate events (back/forward button clicks)
        window.addEventListener('popstate', function(e) {
            navigationAttempts++;
            
            // Show guidance message on first few attempts
            if (navigationAttempts <= 3) {
                setTimeout(showNavigationGuidance, 100);
            }
        });
        
        // Monitor for rapid navigation attempts (keyboard shortcuts)
        document.addEventListener('keydown', function(e) {
            // Alt + Left Arrow (back) or Alt + Right Arrow (forward)
            if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                showNavigationGuidance();
            }
            
            // Ctrl + Left/Right (also navigation shortcuts in some browsers)
            if (e.ctrlKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                showNavigationGuidance();
            }
        });
    }
    
    // Add visual indicator for controlled navigation
    function addNavigationIndicator() {
        // Add a small indicator that navigation is controlled
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 15px;
            font-size: 11px;
            z-index: 1000;
            opacity: 0.6;
            font-family: Arial, sans-serif;
        `;
        indicator.innerHTML = `<i class="fas fa-route" style="margin-right: 5px;"></i>Controlled Navigation`;
        
        document.body.appendChild(indicator);
        
        // Fade out after 3 seconds
        setTimeout(() => {
            if (indicator && indicator.parentElement) {
                indicator.style.transition = 'opacity 1s ease-out';
                indicator.style.opacity = '0';
                setTimeout(() => {
                    if (indicator && indicator.parentElement) {
                        indicator.remove();
                    }
                }, 1000);
            }
        }, 3000);
    }
    
    // Initialize
    function init() {
        setupNavigationMonitoring();
        
        // Add indicator after page loads
        setTimeout(addNavigationIndicator, 1000);
        
        console.log('🧭 Navigation guidance active - users will be guided to use page navigation');
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Make showingMessage available globally for the close button
    window.showingMessage = showingMessage;
    
})();
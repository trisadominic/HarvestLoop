// Navigation utility to maintain proper browser history
class NavigationManager {
    static navigate(url, replace = false) {
        if (replace) {
            // Use this for login redirects where you don't want users to go back
            window.location.replace(url);
        } else {
            // Use this for normal navigation to preserve back button functionality
            window.location.href = url;
        }
    }

    static pushState(url, title = '', state = {}) {
        // Use HTML5 History API for better navigation experience
        history.pushState(state, title, url);
        
        // Dispatch a custom event to notify other parts of the app
        window.dispatchEvent(new CustomEvent('navigationchange', {
            detail: { url, title, state }
        }));
    }

    static replaceState(url, title = '', state = {}) {
        history.replaceState(state, title, url);
        
        window.dispatchEvent(new CustomEvent('navigationchange', {
            detail: { url, title, state }
        }));
    }

    static goBack() {
        history.back();
    }

    static goForward() {
        history.forward();
    }

    static setupPopstateHandler() {
        // Handle browser back/forward button clicks
        window.addEventListener('popstate', (event) => {
            console.log('Browser back/forward button clicked:', event.state);
            
            // Prevent browser navigation by pushing current state back
            event.preventDefault();
            
            // Override browser navigation - stay on current page
            this.replaceState(window.location.href, document.title, {
                page: this.getCurrentPageName(),
                timestamp: Date.now(),
                navigationBlocked: true
            });
            
            // Show message that navigation is controlled by site
            this.showNavigationMessage();
        });
        
        // Disable browser navigation on page load
        this.disableBrowserNavigation();
    }

    static disableBrowserNavigation() {
        // Replace current history entry to prevent back navigation
        history.replaceState(null, document.title, window.location.href);
        
        // Push a dummy state to prevent forward navigation
        history.pushState(null, document.title, window.location.href);
        
        // Immediately replace it to stay on current page
        history.replaceState({
            page: this.getCurrentPageName(),
            navigationDisabled: true,
            timestamp: Date.now()
        }, document.title, window.location.href);
    }

    static showNavigationMessage() {
        // Remove existing message
        const existingMsg = document.getElementById('nav-message');
        if (existingMsg) existingMsg.remove();
        
        // Show brief message about navigation
        const msgDiv = document.createElement('div');
        msgDiv.id = 'nav-message';
        msgDiv.className = 'fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg';
        msgDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-info-circle mr-2"></i>
                <span>Use page navigation instead</span>
            </div>
        `;
        
        document.body.appendChild(msgDiv);
        
        // Auto-remove after 2 seconds
        setTimeout(() => {
            if (msgDiv.parentElement) {
                msgDiv.remove();
            }
        }, 2000);
    }

    // Initialize navigation manager
    static init() {
        this.setupPopstateHandler();
        
        // Disable browser navigation immediately
        this.disableBrowserNavigation();
        
        // Track initial page load
        this.replaceState(window.location.href, document.title, {
            page: this.getCurrentPageName(),
            timestamp: Date.now(),
            navigationControlled: true
        });
        
        // Add visual indicator that navigation is enhanced
        console.log('🔄 Navigation Manager: Browser navigation controlled by site');
        
        // Disable context menu on navigation buttons (additional protection)
        this.disableNavigationContextMenu();
    }

    static disableNavigationContextMenu() {
        // Prevent right-click context menu on navigation elements
        document.addEventListener('contextmenu', (e) => {
            // Allow context menu on most elements, just prevent on navigation
            if (e.target.closest('.navigation-disabled')) {
                e.preventDefault();
            }
        });
        
        // Disable F5 refresh and Ctrl+R to prevent navigation reset
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'F5') || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.showNavigationMessage();
            }
            
            // Disable browser back shortcuts
            if ((e.altKey && e.key === 'ArrowLeft') || (e.altKey && e.key === 'ArrowRight')) {
                e.preventDefault();
                this.showNavigationMessage();
            }
        });
    }

    static getCurrentPageName() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        return filename.replace('.html', '') || 'home';
    }

    // Improved navigation for authentication flows
    static redirectToLogin(message = 'Please login to continue') {
        // Store current page to return after login
        sessionStorage.setItem('returnTo', window.location.href);
        sessionStorage.setItem('loginMessage', message);
        
        // Use replace for login redirects to prevent back button issues
        this.navigate('/login.html', true);
    }

    static redirectAfterLogin() {
        const returnTo = sessionStorage.getItem('returnTo');
        sessionStorage.removeItem('returnTo');
        sessionStorage.removeItem('loginMessage');
        
        if (returnTo && !returnTo.includes('login.html')) {
            this.navigate(returnTo);
        } else {
            this.navigate('/consumer-dashboard.html');
        }
    }

    // Better subscription redirect
    static redirectToSubscription(message = 'Subscription required') {
        // Store current context
        sessionStorage.setItem('subscriptionReturnTo', window.location.href);
        sessionStorage.setItem('subscriptionMessage', message);
        
        // Don't use replace here - allow back button to work
        this.navigate('/subscription.html');
    }

    // Global function to handle subscription redirects consistently
    static handleSubscriptionRedirect(insufficientPointsMessage = 'You need more subscription points for this feature') {
        if (window.NavigationManager) {
            NavigationManager.redirectToSubscription(insufficientPointsMessage);
        } else {
            window.location.href = '/subscription.html';
        }
    }
}

// Global utility function for subscription redirects
window.redirectToSubscription = function(message = 'Subscription upgrade required') {
    if (window.NavigationManager) {
        NavigationManager.redirectToSubscription(message);
    } else {
        window.location.href = '/subscription.html';
    }
};

// Initialize navigation manager when script loads
document.addEventListener('DOMContentLoaded', () => {
    NavigationManager.init();
});

// Make it globally available
window.NavigationManager = NavigationManager;
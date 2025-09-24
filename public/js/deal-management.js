// Deal Management JavaScript with Offline Support

class DealManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentDeal = null;
        
        // Network status tracking
        this.isOnline = navigator.onLine;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 5000; // Start with 5 seconds
        
        // Load cached deal states from localStorage
        this.acceptedDeals = JSON.parse(localStorage.getItem('acceptedDeals') || '[]');
        this.cancelledDeals = JSON.parse(localStorage.getItem('cancelledDeals') || '[]');
        this.declinedDeals = JSON.parse(localStorage.getItem('declinedDeals') || '[]');
        this.completedDeals = JSON.parse(localStorage.getItem('completedDeals') || '[]');
        
        // Load cached deals data
        this.cachedDeals = JSON.parse(localStorage.getItem('cachedDeals') || '[]');
    }

    // Initialize event listeners for deal-related UI elements
    init() {
        this.setupEventListeners();
        this.startPollingDeals();
        this.setupNetworkListeners();
        this.startAutoRefresh();
    }

    setupEventListeners() {
        // Deal button clicks are handled in product-card.js
        document.addEventListener('dealProposed', this.handleDealProposed.bind(this));
        document.addEventListener('dealAccepted', this.handleDealAccepted.bind(this));
        document.addEventListener('dealCancelled', this.handleDealCancelled.bind(this));
    }
    
    // Setup network status listeners
    setupNetworkListeners() {
        // Listen for online status changes
        window.addEventListener('online', () => {
            console.log('🌐 Back online!');
            this.isOnline = true;
            this.reconnectAttempts = 0;
            this.hideOfflineNotification();
            this.checkDeals(); // Refresh data immediately when back online
        });
        
        window.addEventListener('offline', () => {
            console.log('📵 Gone offline!');
            this.isOnline = false;
            this.showOfflineNotification();
        });
        
        // Periodically check connection by pinging server
        setInterval(() => this.checkConnection(), 30000);
    }

    // Start polling for deal updates
    startPollingDeals() {
        this.checkDeals();
        setInterval(() => this.checkDeals(), 30000); // Check every 30 seconds
    }
    
    // Start auto refresh to prevent session timeout issues
    startAutoRefresh() {
        // Force a page refresh every 2 hours to prevent stale sessions
        setTimeout(() => {
            console.log('🔄 Auto-refreshing page to prevent stale data');
            window.location.reload();
        }, 2 * 60 * 60 * 1000); // 2 hours
    }
    
    // Check internet connection by making a small request
    async checkConnection() {
        if (!navigator.onLine) {
            this.isOnline = false;
            return;
        }
        
        try {
            // Set up AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            // Try multiple endpoints in sequence for better resilience
            const endpoints = [
                '/ping',
                '/api/ping',
                '/',
                '/api'
            ];
            
            for (let i = 0; i < endpoints.length; i++) {
                try {
                    console.log(`🔍 Checking connection using endpoint: ${endpoints[i]}`);
                    const response = await fetch(endpoints[i], { 
                        method: 'HEAD',
                        cache: 'no-store',
                        signal: controller.signal,
                        keepalive: true // Use keepalive flag
                    });
                    
                    // Clear the timeout
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        if (!this.isOnline) {
                            console.log('🔄 Connection restored!');
                            this.isOnline = true;
                            this.reconnectAttempts = 0;
                            this.hideOfflineNotification();
                            this.checkDeals();
                        }
                        return; // Success! Exit the function
                    }
                } catch (endpointError) {
                    console.log(`❌ Endpoint ${endpoints[i]} failed:`, endpointError.message);
                    // Continue to the next endpoint
                }
            }
            
            // If we get here, all endpoints failed
            console.log('❌ All connection endpoints failed');
            this.handleConnectionFailure();
        } catch (error) {
            console.error('❌ Connection check failed:', error);
            this.handleConnectionFailure();
        }
    }
    
    // Handle connection failures
    handleConnectionFailure() {
        this.isOnline = false;
        this.reconnectAttempts++;
        console.log(`📶 Connection attempt ${this.reconnectAttempts} failed`);
        
        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            this.showReconnectingNotification(this.reconnectAttempts, this.maxReconnectAttempts);
            
            // Use exponential backoff for reconnection attempts
            setTimeout(() => {
                this.checkConnection();
            }, this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1));
        } else {
            this.showOfflineNotification();
        }
    }

    // Check for deal updates
    async checkDeals() {
        try {
            // If offline, use cached deals
            if (!this.isOnline) {
                console.log('📵 Offline: Using cached deals');
                this.updateDealsList(this.cachedDeals);
                return;
            }
            
            console.log('🔍 Checking for deal updates...');
            
            // Use fetch with a timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            try {
                const response = await fetch('/api/deals/my-deals', {
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    },
                    // Add cache busting parameter to prevent browser caching
                    cache: 'no-store',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) throw new Error('Failed to fetch deals');
                
                let deals = await response.json();
                console.log(`📊 Fetched ${deals.length} deals`);
                
                // Cache the deals for offline use
                localStorage.setItem('cachedDeals', JSON.stringify(deals));
                this.cachedDeals = deals;
                
                // Apply locally cached statuses for deals that have issues syncing with the server
                deals = deals.map(deal => {
                    const dealId = deal._id;
                    
                    // Override status from localStorage if we have it
                    if (this.acceptedDeals.includes(dealId) && deal.status === 'pending') {
                        console.log(`🔧 Fixing deal ${dealId} status to accepted from local cache`);
                        deal.status = 'accepted';
                    }
                    
                    if (this.cancelledDeals.includes(dealId) && 
                       (deal.status === 'pending' || deal.status === 'accepted')) {
                        console.log(`🔧 Fixing deal ${dealId} status to cancelled from local cache`);
                        deal.status = 'cancelled';
                    }
                    
                    if (this.declinedDeals.includes(dealId) && deal.status === 'pending') {
                        console.log(`🔧 Fixing deal ${dealId} status to declined from local cache`);
                        deal.status = 'declined';
                    }
                    
                    if (this.completedDeals.includes(dealId) && deal.status === 'accepted') {
                        console.log(`🔧 Fixing deal ${dealId} status to purchased from local cache`);
                        deal.status = 'purchased';
                    }
                    
                    return deal;
                });
                
                this.updateDealsList(deals);
            } catch (error) {
                console.log('❌ Network error when fetching deals:', error);
                // Use cached deals if available
                if (this.cachedDeals && this.cachedDeals.length > 0) {
                    console.log('📦 Using cached deals data');
                    this.updateDealsList(this.cachedDeals);
                } else {
                    console.log('❌ No cached deals available');
                }
                this.handleConnectionFailure();
            }
        } catch (error) {
            console.error('❌ Deal check failed:', error);
        }
    }
    
    // Show offline notification to user
    showOfflineNotification() {
        const existingNotification = document.getElementById('offline-notification');
        if (existingNotification) return;
        
        const notification = document.createElement('div');
        notification.id = 'offline-notification';
        notification.className = 'fixed top-0 left-0 right-0 bg-red-500 text-white py-2 px-4 text-center z-50';
        notification.innerHTML = `
            <div class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                You are currently offline. Some features may be limited.
                <button id="try-reconnect" class="ml-4 bg-white text-red-500 px-2 py-1 rounded text-sm">
                    Try Reconnect
                </button>
            </div>
        `;
        
        document.body.prepend(notification);
        
        document.getElementById('try-reconnect').addEventListener('click', () => {
            this.reconnectAttempts = 0;
            this.checkConnection();
        });
    }
    
    // Show reconnecting notification
    showReconnectingNotification(attempt, maxAttempts) {
        const existingNotification = document.getElementById('offline-notification');
        if (existingNotification) {
            existingNotification.innerHTML = `
                <div class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Reconnecting... Attempt ${attempt}/${maxAttempts}
                    <button id="try-reconnect" class="ml-4 bg-white text-red-500 px-2 py-1 rounded text-sm">
                        Try Now
                    </button>
                </div>
            `;
            
            document.getElementById('try-reconnect').addEventListener('click', () => {
                this.checkConnection();
            });
        } else {
            this.showOfflineNotification();
        }
    }
    
    // Hide offline notification
    hideOfflineNotification() {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.remove();
        }
    }

    // Accept a deal (Farmer only)
    async acceptDeal(dealId) {
        try {
            console.log('🔔 Accepting deal with ID:', dealId);
            
            if (!this.isOnline) {
                console.log('📵 Offline: Storing acceptance in local cache');
                const acceptedDeals = JSON.parse(localStorage.getItem('acceptedDeals') || '[]');
                if (!acceptedDeals.includes(dealId)) {
                    acceptedDeals.push(dealId);
                    localStorage.setItem('acceptedDeals', JSON.stringify(acceptedDeals));
                    this.acceptedDeals = acceptedDeals;
                }
                alert('You are currently offline. The deal will be accepted when you reconnect to the internet.');
                return;
            }
            
            // First try the direct API endpoint that requires authentication
            let response = await fetch(`/api/deals/${dealId}/accept`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            // If that fails, try the email link version which doesn't require auth
            if (!response.ok) {
                console.log('⚠️ First accept method failed, trying alternative endpoint');
                response = await fetch(`/api/deals/${dealId}/accept`, {
                    method: 'GET'
                });
            }

            if (!response.ok) {
                console.error('❌ Both accept methods failed');
                throw new Error('Failed to accept deal');
            }

            console.log('✅ Deal accepted successfully');
            
            // Store in localStorage that this deal has been accepted
            const acceptedDeals = JSON.parse(localStorage.getItem('acceptedDeals') || '[]');
            if (!acceptedDeals.includes(dealId)) {
                acceptedDeals.push(dealId);
                localStorage.setItem('acceptedDeals', JSON.stringify(acceptedDeals));
                this.acceptedDeals = acceptedDeals;
            }
            
            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealAccepted', { detail: { dealId } }));
        } catch (error) {
            console.error('Deal acceptance failed:', error);
            alert('Failed to accept deal. Please try again.');
        }
    }

    // Decline a deal (Farmer only)
    async declineDeal(dealId) {
        try {
            console.log('🔔 Declining deal with ID:', dealId);
            
            if (!this.isOnline) {
                console.log('📵 Offline: Storing declination in local cache');
                const declinedDeals = JSON.parse(localStorage.getItem('declinedDeals') || '[]');
                if (!declinedDeals.includes(dealId)) {
                    declinedDeals.push(dealId);
                    localStorage.setItem('declinedDeals', JSON.stringify(declinedDeals));
                    this.declinedDeals = declinedDeals;
                }
                alert('You are currently offline. The deal will be declined when you reconnect to the internet.');
                return;
            }
            
            // First try the direct API endpoint that requires authentication
            let response = await fetch(`/api/deals/${dealId}/decline`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            // If that fails, try the email link version which doesn't require auth
            if (!response.ok) {
                console.log('⚠️ First decline method failed, trying alternative endpoint');
                response = await fetch(`/api/deals/${dealId}/decline`, {
                    method: 'GET'
                });
            }

            if (!response.ok) {
                console.error('❌ Both decline methods failed');
                throw new Error('Failed to decline deal');
            }

            console.log('✅ Deal declined successfully');
            
            // Store in localStorage that this deal has been declined
            const declinedDeals = JSON.parse(localStorage.getItem('declinedDeals') || '[]');
            if (!declinedDeals.includes(dealId)) {
                declinedDeals.push(dealId);
                localStorage.setItem('declinedDeals', JSON.stringify(declinedDeals));
                this.declinedDeals = declinedDeals;
            }
            
            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealDeclined', { detail: { dealId } }));
        } catch (error) {
            console.error('Deal decline failed:', error);
            alert('Failed to decline deal. Please try again.');
        }
    }

    // Complete a deal (Consumer only)
    async completeDeal(dealId) {
        try {
            console.log('🔔 Completing deal with ID:', dealId);
            
            if (!this.isOnline) {
                console.log('📵 Offline: Storing completion in local cache');
                const completedDeals = JSON.parse(localStorage.getItem('completedDeals') || '[]');
                if (!completedDeals.includes(dealId)) {
                    completedDeals.push(dealId);
                    localStorage.setItem('completedDeals', JSON.stringify(completedDeals));
                    this.completedDeals = completedDeals;
                }
                alert('You are currently offline. The deal will be completed when you reconnect to the internet.');
                return;
            }
            
            // First try the direct API endpoint that requires authentication
            let response = await fetch(`/api/deals/${dealId}/purchase`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            // If that fails, try the alternative endpoint
            if (!response.ok) {
                console.log('⚠️ First complete method failed, trying alternative endpoint');
                response = await fetch(`/api/deals/${dealId}/purchase`, {
                    method: 'GET'
                });
            }

            if (!response.ok) {
                console.error('❌ Both complete methods failed');
                throw new Error('Failed to complete deal');
            }

            console.log('✅ Deal completed successfully');
            
            // Store in localStorage that this deal has been completed
            const completedDeals = JSON.parse(localStorage.getItem('completedDeals') || '[]');
            if (!completedDeals.includes(dealId)) {
                completedDeals.push(dealId);
                localStorage.setItem('completedDeals', JSON.stringify(completedDeals));
                this.completedDeals = completedDeals;
            }
            
            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealCompleted', { detail: { dealId } }));
        } catch (error) {
            console.error('Deal completion failed:', error);
            alert('Failed to complete deal. Please try again.');
        }
    }

    // Cancel a deal
    async cancelDeal(dealId) {
        if (!confirm('Are you sure you want to cancel this deal?')) return;

        try {
            console.log('🔔 Cancelling deal with ID:', dealId);
            
            if (!this.isOnline) {
                console.log('📵 Offline: Storing cancellation in local cache');
                const cancelledDeals = JSON.parse(localStorage.getItem('cancelledDeals') || '[]');
                if (!cancelledDeals.includes(dealId)) {
                    cancelledDeals.push(dealId);
                    localStorage.setItem('cancelledDeals', JSON.stringify(cancelledDeals));
                    this.cancelledDeals = cancelledDeals;
                }
                alert('You are currently offline. The deal will be cancelled when you reconnect to the internet.');
                return;
            }
            
            // First try the direct API endpoint that requires authentication
            let response = await fetch(`/api/deals/${dealId}/cancel`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            // If that fails, try the email link version which doesn't require auth
            if (!response.ok) {
                console.log('⚠️ First cancel method failed, trying alternative endpoint');
                response = await fetch(`/api/deals/${dealId}/cancel`, {
                    method: 'GET'
                });
            }

            if (!response.ok) {
                console.error('❌ Both cancel methods failed');
                throw new Error('Failed to cancel deal');
            }

            console.log('✅ Deal cancelled successfully');
            
            // Store in localStorage that this deal has been cancelled
            const cancelledDeals = JSON.parse(localStorage.getItem('cancelledDeals') || '[]');
            if (!cancelledDeals.includes(dealId)) {
                cancelledDeals.push(dealId);
                localStorage.setItem('cancelledDeals', JSON.stringify(cancelledDeals));
                this.cancelledDeals = cancelledDeals;
            }
            
            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealCancelled', { detail: { dealId } }));
        } catch (error) {
            console.error('Deal cancellation failed:', error);
            alert('Failed to cancel deal. Please try again.');
        }
    }
}

// Initialize deal manager on page load
document.addEventListener('DOMContentLoaded', () => {
    const dealManager = new DealManager();
    dealManager.init();
    
    // Make dealManager globally available
    window.dealManager = dealManager;
});
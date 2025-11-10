// Deal Management JavaScript

class DealManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.currentDeal = null;
    }

    // Initialize event listeners for deal-related UI elements
    init() {
        this.setupEventListeners();
        this.startPollingDeals();
    }

    setupEventListeners() {
        // Deal button clicks are handled in product-card.js
        document.addEventListener('dealProposed', this.handleDealProposed.bind(this));
        document.addEventListener('dealAccepted', this.handleDealAccepted.bind(this));
        document.addEventListener('dealCancelled', this.handleDealCancelled.bind(this));
    }

    // Start polling for deal updates
    startPollingDeals() {
        this.checkDeals();
        setInterval(() => this.checkDeals(), 30000); // Check every 30 seconds
    }

    // Check for deal updates
    async checkDeals() {
        try {
            const response = await fetch('/api/deals/my-deals', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch deals');

            const deals = await response.json();
            this.updateDealsList(deals);
        } catch (error) {
            console.error('Deal check failed:', error);
        }
    }

    // Update deals list in UI
    updateDealsList(deals) {
        const dealsList = document.getElementById('deals-list');
        if (!dealsList) return;

        dealsList.innerHTML = deals.map(deal => `
            <div class="bg-white rounded-lg shadow-md p-4 mb-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold">${deal.productId.name}</h3>
                        <p class="text-sm text-gray-600">Quantity: ${deal.quantity}</p>
                        <p class="text-sm text-gray-600">Proposed Price: ₹${deal.proposedPrice}</p>
                    </div>
                    <span class="px-2 py-1 rounded text-sm ${this.getDealStatusClasses(deal.status)}">
                        ${deal.status}
                    </span>
                </div>
                ${this.getDealActions(deal)}
            </div>
        `).join('');

        // Add event listeners to action buttons
        this.attachDealActionListeners();
    }

    // Get CSS classes for deal status
    getDealStatusClasses(status) {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    // Get action buttons based on deal status
    getDealActions(deal) {
        const userRole = JSON.parse(localStorage.getItem('user')).role;
        
        if (userRole === 'Farmer') {
            if (deal.status === 'pending') {
                return `
                    <div class="flex gap-2 mt-4">
                        <button class="accept-deal bg-green-500 text-white px-4 py-2 rounded" 
                            data-deal-id="${deal._id}">
                            Accept
                        </button>
                        <button class="decline-deal bg-red-500 text-white px-4 py-2 rounded"
                            data-deal-id="${deal._id}">
                            Decline
                        </button>
                    </div>
                `;
            }
        } else if (userRole === 'Consumer') {
            if (deal.status === 'accepted') {
                return `
                    <div class="flex gap-2 mt-4">
                        <button class="complete-deal bg-green-500 text-white px-4 py-2 rounded"
                            data-deal-id="${deal._id}">
                            Complete Purchase
                        </button>
                        <button class="cancel-deal bg-red-500 text-white px-4 py-2 rounded"
                            data-deal-id="${deal._id}">
                            Cancel
                        </button>
                    </div>
                `;
            }
        }
        return '';
    }

    // Attach event listeners to deal action buttons
    attachDealActionListeners() {
        document.querySelectorAll('.accept-deal').forEach(btn => {
            btn.addEventListener('click', () => this.acceptDeal(btn.dataset.dealId));
        });

        document.querySelectorAll('.decline-deal').forEach(btn => {
            btn.addEventListener('click', () => this.declineDeal(btn.dataset.dealId));
        });

        document.querySelectorAll('.complete-deal').forEach(btn => {
            btn.addEventListener('click', () => this.completeDeal(btn.dataset.dealId));
        });

        document.querySelectorAll('.cancel-deal').forEach(btn => {
            btn.addEventListener('click', () => this.cancelDeal(btn.dataset.dealId));
        });
    }

    // Handle new deal proposal
    async handleDealProposed(event) {
        const { deal } = event.detail;
        this.currentDeal = deal;
        this.checkDeals(); // Refresh deals list
    }

    // Handle deal acceptance
    async handleDealAccepted(event) {
        const { deal } = event.detail;
        this.checkDeals(); // Refresh deals list
    }

    // Handle deal cancellation
    async handleDealCancelled(event) {
        const { deal } = event.detail;
        this.checkDeals(); // Refresh deals list
    }

    // Accept a deal (Farmer only)
    async acceptDeal(dealId) {
        try {
            const response = await fetch(`/api/deals/${dealId}/respond`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: 'accepted' })
            });

            if (!response.ok) throw new Error('Failed to accept deal');

            const deal = await response.json();
            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealAccepted', { detail: { deal } }));
        } catch (error) {
            console.error('Deal acceptance failed:', error);
            alert('Failed to accept deal. Please try again.');
        }
    }

    // Decline a deal (Farmer only)
    async declineDeal(dealId) {
        try {
            const response = await fetch(`/api/deals/${dealId}/respond`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status: 'declined' })
            });

            if (!response.ok) throw new Error('Failed to decline deal');

            this.checkDeals();
        } catch (error) {
            console.error('Deal decline failed:', error);
            alert('Failed to decline deal. Please try again.');
        }
    }

    // Complete a deal (Consumer only)
    async completeDeal(dealId) {
        try {
            const response = await fetch(`/api/deals/${dealId}/complete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to complete deal');

            const result = await response.json();
            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealCompleted', { detail: result }));
        } catch (error) {
            console.error('Deal completion failed:', error);
            alert('Failed to complete deal. Please try again.');
        }
    }

    // Cancel a deal
    async cancelDeal(dealId) {
        if (!confirm('Are you sure you want to cancel this deal?')) return;

        try {
            const response = await fetch(`/api/deals/${dealId}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to cancel deal');

            this.checkDeals();
            document.dispatchEvent(new CustomEvent('dealCancelled', { detail: { dealId } }));
        } catch (error) {
            console.error('Deal cancellation failed:', error);
            alert('Failed to cancel deal. Please try again.');
        }
    }
}

// Initialize deal management when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const dealManager = new DealManager();
    dealManager.init();
});

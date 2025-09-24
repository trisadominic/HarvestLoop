// Consumer Dashboard JavaScript

// Initialize dashboard components
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
});

async function initializeDashboard() {
    await Promise.all([
        loadSubscriptionInfo(),
        loadActiveOrders(),
        loadDeals(),
        loadUnlockedFarmers()
    ]);
}

// Load subscription information
async function loadSubscriptionInfo() {
    try {
        const response = await fetch('/api/subscriptions/my-subscription', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const subscription = await response.json();

        const subscriptionCard = document.querySelector('#subscription-info');
        if (subscription.status === 'active') {
            subscriptionCard.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">Your Subscription</h3>
                    <p class="text-green-600 font-bold">Plan: ${subscription.plan}</p>
                    <p>Points Remaining: ${subscription.points}</p>
                    <p>Expires: ${new Date(subscription.endDate).toLocaleDateString()}</p>
                </div>
            `;
        } else {
            subscriptionCard.innerHTML = `
                <div class="bg-white p-4 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-2">No Active Subscription</h3>
                    <a href="/subscription.html" class="btn bg-green-500 text-white px-4 py-2 rounded">
                        Get Subscription
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load subscription:', error);
    }
}

// Load active orders
async function loadActiveOrders() {
    try {
        const response = await fetch('/api/orders/my-orders?status=pending', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const orders = await response.json();

        const ordersContainer = document.querySelector('#active-orders');
        if (orders.length === 0) {
            ordersContainer.innerHTML = '<p class="text-gray-500">No active orders</p>';
            return;
        }

        ordersContainer.innerHTML = orders.map(order => `
            <div class="bg-white p-4 rounded-lg shadow mb-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold">${order.productId.name}</h4>
                        <p>Quantity: ${order.quantity}</p>
                        <p>Total: ₹${(order.price * order.quantity).toFixed(2)}</p>
                    </div>
                    <span class="px-2 py-1 rounded ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'purchased' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }">
                        ${order.status}
                    </span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

// Load active deals
async function loadDeals() {
    try {
        const response = await fetch('/api/deals/my-deals?status=pending,accepted', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const deals = await response.json();

        const dealsContainer = document.querySelector('#active-deals');
        if (deals.length === 0) {
            dealsContainer.innerHTML = '<p class="text-gray-500">No active deals</p>';
            return;
        }

        dealsContainer.innerHTML = deals.map(deal => `
            <div class="bg-white p-4 rounded-lg shadow mb-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-semibold">${deal.productId.name}</h4>
                        <p>Quantity: ${deal.quantity}</p>
                        <p>Proposed Price: ₹${deal.proposedPrice}</p>
                        <p>Status: ${deal.status}</p>
                    </div>
                    ${deal.status === 'accepted' ? `
                        <button 
                            onclick="completeDeal('${deal._id}')"
                            class="bg-green-500 text-white px-4 py-2 rounded">
                            Complete Purchase
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load deals:', error);
    }
}

// Load unlocked farmers
async function loadUnlockedFarmers() {
    try {
        const response = await fetch('/api/subscriptions/my-subscription', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const subscription = await response.json();

        if (!subscription.unlockedFarmers) return;

        const farmersContainer = document.querySelector('#unlocked-farmers');
        farmersContainer.innerHTML = subscription.unlockedFarmers.map(farmer => `
            <div class="bg-white p-4 rounded-lg shadow mb-4">
                <h4 class="font-semibold">${farmer.farmerId.username}</h4>
                <p>Unlocked: ${new Date(farmer.unlockedAt).toLocaleDateString()}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load unlocked farmers:', error);
    }
}

// Complete a deal
async function completeDeal(dealId) {
    try {
        const response = await fetch(`/api/deals/${dealId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) throw new Error('Failed to complete deal');

        // Reload deals and orders
        await Promise.all([
            loadActiveOrders(),
            loadDeals()
        ]);

        alert('Deal completed successfully!');
    } catch (error) {
        alert(error.message || 'Failed to complete deal');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    document.querySelector('#refresh-dashboard')?.addEventListener('click', () => {
        initializeDashboard();
    });

    // Notification polling (in production, use WebSocket)
    setInterval(checkNotifications, 30000); // Check every 30 seconds
}

// Check for new notifications
async function checkNotifications() {
    try {
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const notifications = await response.json();

        const unread = notifications.filter(n => !n.read);
        updateNotificationBadge(unread.length);

        // Update notification list if panel is open
        const notificationList = document.querySelector('#notification-list');
        if (notificationList && notificationList.classList.contains('active')) {
            renderNotifications(notifications);
        }
    } catch (error) {
        console.error('Failed to check notifications:', error);
    }
}

// Update notification badge
function updateNotificationBadge(count) {
    const badge = document.querySelector('#notification-badge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

// Render notifications in the panel
function renderNotifications(notifications) {
    const list = document.querySelector('#notification-list');
    if (!list) return;

    list.innerHTML = notifications.map(notification => `
        <div class="p-4 ${notification.read ? 'bg-gray-50' : 'bg-white'} border-b">
            <p class="${notification.read ? 'text-gray-600' : 'text-black'}">${notification.message}</p>
            <small class="text-gray-500">
                ${new Date(notification.createdAt).toLocaleString()}
            </small>
        </div>
    `).join('');
}

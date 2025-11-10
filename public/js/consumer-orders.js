document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'Consumer') {
        window.location.href = '/login.html';
        return;
    }

    // Initialize page
    setupProfileDropdown();
    setupStatusFilter();
    fetchOrders();
});

let orders = [];

// Status description helper function
function getStatusDescription(status) {
    const statusDescriptions = {
        'pending': 'In Negotiation - Waiting for farmer or consumer action',
        'purchased': 'Successfully Purchased - Consumer bought the product',
        'cancelled': 'Cancelled - Order rejected or cancelled during negotiation',
        'accepted': 'Accepted by Farmer',
        'declined': 'Declined by Farmer',
        'expired': 'Deal Expired'
    };
    return statusDescriptions[status] || status;
}

// Fetch orders from API
async function fetchOrders(statusFilter = '') {
    const token = localStorage.getItem('token');
    const loadingState = document.getElementById('loading-state');
    const ordersContainer = document.getElementById('orders-container');
    const emptyState = document.getElementById('empty-state');
    const orderCount = document.getElementById('orderCount');

    try {
        // Show loading state
        loadingState.classList.remove('hidden');
        ordersContainer.classList.add('hidden');
        emptyState.classList.add('hidden');

        // Build API URL with status filter
        let apiUrl = '/api/orders/my-orders?role=consumer';
        if (statusFilter) {
            apiUrl += `&status=${statusFilter}`;
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        orders = await response.json();
        console.log('Orders received:', orders);

        // Hide loading state
        loadingState.classList.add('hidden');

        // Update order count
        const filterText = statusFilter ? ` (${statusFilter})` : '';
        orderCount.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''} found${filterText}`;

        if (orders.length === 0) {
            // Show empty state
            emptyState.classList.remove('hidden');
        } else {
            // Show orders
            displayOrders(orders);
            ordersContainer.classList.remove('hidden');
        }

    } catch (error) {
        console.error('Error fetching orders:', error);
        
        // Hide loading state
        loadingState.classList.add('hidden');
        
        // Show error message
        ordersContainer.innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-500 text-4xl mb-4">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Error Loading Orders</h3>
                <p class="text-gray-600 mb-4">Unable to fetch your orders. Please try again.</p>
                <button onclick="fetchOrders()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
                    <i class="fas fa-redo mr-2"></i>Retry
                </button>
            </div>
        `;
        ordersContainer.classList.remove('hidden');
    }
}

// Display orders in the UI
function displayOrders(orders) {
    const container = document.getElementById('orders-container');
    
    if (orders.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = orders.map(order => createOrderCard(order)).join('');
}

// Create individual order card HTML
function createOrderCard(order) {
    const statusClass = `status-${order.status}`;
    const statusIcon = getStatusIcon(order.status);
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const orderTime = new Date(order.createdAt).toLocaleTimeString();
    
    // Determine if this is a deal or regular order
    const isDeal = order.type === 'deal';
    
    // Get product info
    const productName = order.productId?.name || order.productId?.product_name || 'Unknown Product';
    const productImage = order.productId?.imageUrl || '/assets/default-product.jpg';
    
    // Get farmer info
    const farmerName = order.farmerId?.username || 'Unknown Farmer';
    
    // Price display for deals
    const priceDisplay = isDeal ? 
        (order.proposedPrice && order.originalPrice && order.proposedPrice !== order.originalPrice ? 
            `<p class="text-lg font-semibold text-green-600">₹${order.price} <span class="text-sm line-through text-gray-400">₹${order.originalPrice}</span></p>` :
            `<p class="text-lg font-semibold text-gray-900">₹${order.price}</p>`) :
        `<p class="text-lg font-semibold text-gray-900">₹${order.price}</p>`;
    
    return `
        <div class="order-card ${order.status === 'cancelled' || order.status === 'declined' ? 'cancelled' : ''} bg-white rounded-lg shadow-md overflow-hidden cursor-pointer" onclick="showOrderDetails('${order._id}')">
            <div class="p-6 order-content">
                <!-- Order Header -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="text-2xl">
                            <i class="fas ${isDeal ? 'fa-handshake' : 'fa-receipt'} ${getStatusColor(order.status)}"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">#${order._id.slice(-8).toUpperCase()}</h3>
                            <p class="text-sm text-gray-500">${orderDate} at ${orderTime}</p>
                            <p class="text-xs ${getStatusTextColor(order.status)} font-medium">
                                ${isDeal ? 'Deal' : 'Order'} ${formatStatusText(order.status)}
                                ${isDeal && order.proposedPrice && order.originalPrice && order.proposedPrice !== order.originalPrice ? 
                                    ` (${Math.round(((order.originalPrice - order.proposedPrice) / order.originalPrice) * 100)}% off)` : ''}
                            </p>
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">
                        <i class="${statusIcon} mr-1"></i>
                        ${formatStatusText(order.status)}
                    </div>
                </div>

                <!-- Product Info -->
                <div class="flex items-center space-x-4 mb-4">
                    <div class="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img src="${productImage}" alt="${productName}" 
                             class="w-full h-full object-cover"
                             onerror="this.src='/assets/default-product.jpg'">
                    </div>
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${productName}</h4>
                        <p class="text-sm text-gray-600">Quantity: ${order.quantity}</p>
                        <p class="text-sm text-gray-600">Farmer: ${farmerName}</p>
                        ${isDeal && order.message ? `<p class="text-xs text-gray-500 italic">"${order.message}"</p>` : ''}
                    </div>
                    <div class="text-right">
                        ${priceDisplay}
                        <p class="text-sm text-gray-500">${isDeal ? 'Deal Amount' : 'Total Amount'}</p>
                        ${isDeal && order.expiresAt && order.status === 'pending' ? 
                            `<p class="text-xs text-orange-600">Expires: ${new Date(order.expiresAt).toLocaleDateString()}</p>` : ''}
                    </div>
                </div>

                <!-- Order/Deal Actions -->
                <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div class="flex items-center space-x-4">
                        ${getActionButtons(order, isDeal)}
                    </div>
                    <button onclick="event.stopPropagation(); showOrderDetails('${order._id}')" 
                            class="text-green-600 hover:text-green-700 text-sm font-medium">
                        View Details <i class="fas fa-arrow-right ml-1"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Get status icon based on order/deal status
function getStatusIcon(status) {
    const icons = {
        'pending': 'fas fa-clock',
        'accepted': 'fas fa-check',
        'purchased': 'fas fa-check-circle',
        'cancelled': 'fas fa-times-circle',
        'declined': 'fas fa-times',
        'expired': 'fas fa-hourglass-end'
    };
    return icons[status] || 'fas fa-question-circle';
}

// Get status color for icons
function getStatusColor(status) {
    const colors = {
        'pending': 'text-yellow-500',
        'accepted': 'text-green-600',
        'purchased': 'text-green-700',
        'cancelled': 'text-red-500',
        'declined': 'text-red-500',
        'expired': 'text-gray-500'
    };
    return colors[status] || 'text-gray-500';
}

// Get status text color
function getStatusTextColor(status) {
    const colors = {
        'pending': 'text-yellow-600',
        'accepted': 'text-green-600',
        'purchased': 'text-green-700',
        'cancelled': 'text-red-600',
        'declined': 'text-red-600',
        'expired': 'text-gray-600'
    };
    return colors[status] || 'text-gray-600';
}

// Format status text for display
function formatStatusText(status) {
    const formats = {
        'pending': 'Pending (In Negotiation)',
        'accepted': 'Accepted',
        'purchased': 'Purchased ✓',
        'cancelled': 'Cancelled (Negotiation Ended)',
        'declined': 'Declined',
        'expired': 'Expired'
    };
    return formats[status] || status.charAt(0).toUpperCase() + status.slice(1);
}

// Get action buttons based on status and type
function getActionButtons(order, isDeal) {
    const status = order.status;
    
    if (isDeal) {
        switch (status) {
            case 'pending':
                return `
                    <button onclick="event.stopPropagation(); cancelDeal('${order._id}')" 
                            class="text-red-600 hover:text-red-700 text-sm font-medium">
                        <i class="fas fa-times mr-1"></i>Cancel Deal
                    </button>
                `;
            case 'accepted':
                return `
                    <button onclick="event.stopPropagation(); purchaseDeal('${order._id}')" 
                            class="text-green-600 hover:text-green-700 text-sm font-medium bg-green-50 px-3 py-1 rounded">
                        <i class="fas fa-shopping-cart mr-1"></i>Purchase Now
                    </button>
                `;
            case 'declined':
                return `
                    <span class="text-red-600 text-sm">
                        <i class="fas fa-times-circle mr-1"></i>Deal Declined by Farmer
                    </span>
                `;
            case 'purchased':
                return `
                    <span class="text-blue-600 text-sm">
                        <i class="fas fa-check-circle mr-1"></i>Deal Purchased Successfully
                    </span>
                `;
            case 'cancelled':
                return `
                    <span class="text-red-600 text-sm">
                        <i class="fas fa-times-circle mr-1"></i>Deal Cancelled
                    </span>
                `;
            case 'expired':
                return `
                    <span class="text-gray-600 text-sm">
                        <i class="fas fa-hourglass-end mr-1"></i>Deal Expired
                    </span>
                `;
            default:
                return '';
        }
    } else {
        // Regular order actions
        switch (status) {
            case 'pending':
                return `
                    <button onclick="event.stopPropagation(); cancelOrder('${order._id}')" 
                            class="text-red-600 hover:text-red-700 text-sm font-medium">
                        <i class="fas fa-times mr-1"></i>Cancel Order
                    </button>
                `;
            case 'accepted':
            case 'purchased':
                return `
                    <span class="text-green-600 text-sm">
                        <i class="fas fa-check-circle mr-1"></i>
                        Order Purchased
                    </span>
                `;
            case 'cancelled':
                return `
                    <span class="text-red-600 text-sm">
                        <i class="fas fa-times-circle mr-1"></i>Order Cancelled
                        ${order.cancellationReason ? `<br><span class="text-xs text-gray-500">Reason: ${order.cancellationReason}</span>` : ''}
                    </span>
                `;
            default:
                return '';
        }
    }
}

// Setup status filter
function setupStatusFilter() {
    const statusFilter = document.getElementById('statusFilter');
    statusFilter.addEventListener('change', function() {
        fetchOrders(this.value);
    });
}

// Show order details modal
function showOrderDetails(orderId) {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;

    const modal = document.getElementById('orderModal');
    const content = document.getElementById('orderModalContent');
    
    const orderDate = new Date(order.createdAt).toLocaleString();
    const productName = order.productId?.name || order.productId?.product_name || 'Unknown Product';
    const productImage = order.productId?.imageUrl || '/assets/default-product.jpg';
    const farmerName = order.farmerId?.username || 'Unknown Farmer';
    const farmerEmail = order.farmerId?.email || 'Not available';
    const farmerPhone = order.farmerId?.phone || 'Not available';
    
    content.innerHTML = `
        <div class="space-y-6">
            <!-- Order Info -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-3">Order Information</h3>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600">Order ID:</span>
                        <p class="font-medium">#${order._id.slice(-8).toUpperCase()}</p>
                    </div>
                    <div>
                        <span class="text-gray-600">Status:</span>
                        <p class="font-medium status-badge ${`status-${order.status}`}">
                            <i class="${getStatusIcon(order.status)} mr-1"></i>
                            ${order.status}
                        </p>
                    </div>
                    <div>
                        <span class="text-gray-600">Order Date:</span>
                        <p class="font-medium">${orderDate}</p>
                    </div>
                    <div>
                        <span class="text-gray-600">Total Amount:</span>
                        <p class="font-medium text-green-600">₹${order.price}</p>
                    </div>
                </div>
            </div>

            <!-- Product Details -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-3">Product Details</h3>
                <div class="flex items-center space-x-4">
                    <div class="w-20 h-20 bg-white rounded-lg overflow-hidden">
                        <img src="${productImage}" alt="${productName}" 
                             class="w-full h-full object-cover"
                             onerror="this.src='/assets/default-product.jpg'">
                    </div>
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${productName}</h4>
                        <p class="text-gray-600">Quantity: ${order.quantity}</p>
                        <p class="text-gray-600">Price per unit: ₹${(order.price / order.quantity).toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <!-- Farmer Details -->
            <div class="bg-gray-50 rounded-lg p-4">
                <h3 class="font-semibold text-gray-900 mb-3">Farmer Information</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex items-center">
                        <i class="fas fa-user text-gray-600 mr-3 w-4"></i>
                        <span class="text-gray-600">Name:</span>
                        <span class="ml-2 font-medium">${farmerName}</span>
                    </div>
                    ${order.status === 'accepted' || order.status === 'purchased' ? `
                        <div class="flex items-center">
                            <i class="fas fa-envelope text-gray-600 mr-3 w-4"></i>
                            <span class="text-gray-600">Email:</span>
                            <span class="ml-2 font-medium">${farmerEmail}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-phone text-gray-600 mr-3 w-4"></i>
                            <span class="text-gray-600">Phone:</span>
                            <span class="ml-2 font-medium">${farmerPhone}</span>
                        </div>
                    ` : `
                        <div class="text-yellow-600 text-sm">
                            <i class="fas fa-info-circle mr-1"></i>
                            Contact details will be revealed when order is accepted
                        </div>
                    `}
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end space-x-3">
                ${order.status === 'pending' ? `
                    <button onclick="cancelOrder('${order._id}')" 
                            class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                        <i class="fas fa-times mr-2"></i>Cancel Order
                    </button>
                ` : ''}
                <button onclick="closeOrderModal()" 
                        class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition">
                    Close
                </button>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Close order details modal
function closeOrderModal() {
    document.getElementById('orderModal').classList.add('hidden');
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) {
        return;
    }

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            // Show success notification
            showNotification('Order cancelled successfully');
            
            // Refresh orders
            fetchOrders();
            
            // Close modal if open
            closeOrderModal();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to cancel order');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        alert('An error occurred while cancelling the order');
    }
}

// Cancel a deal
async function cancelDeal(dealId) {
    if (!confirm('Are you sure you want to cancel this deal?')) {
        return;
    }

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/deals/${dealId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showNotification('Deal cancelled successfully');
            fetchOrders(); // Refresh the list
            closeOrderModal();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to cancel deal');
        }
    } catch (error) {
        console.error('Error cancelling deal:', error);
        alert('An error occurred while cancelling the deal');
    }
}

// Purchase an accepted deal
async function purchaseDeal(dealId) {
    if (!confirm('Are you sure you want to purchase this deal? This action cannot be undone.')) {
        return;
    }

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`/api/deals/${dealId}/purchase`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            showNotification('Deal purchased successfully! Order created.');
            fetchOrders(); // Refresh the list
            closeOrderModal();
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to purchase deal');
        }
    } catch (error) {
        console.error('Error purchasing deal:', error);
        alert('An error occurred while purchasing the deal');
    }
}

// Profile dropdown functions
function setupProfileDropdown() {
    const profileButton = document.getElementById('profile-button');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (!profileButton || !profileDropdown) {
        return;
    }
    
    profileButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });
    
    document.addEventListener('click', function(e) {
        if (!profileButton.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            profileDropdown.classList.add('hidden');
        }
    });
}

// Logout function
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        
        showNotification('👋 Logged out successfully!');
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }
}

// Show notification
function showNotification(message) {
    const existingNotification = document.getElementById('notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-check-circle mr-2"></i>
            <span>${message}</span>
            <button onclick="closeNotification()" class="ml-4 text-white hover:text-gray-200">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        closeNotification();
    }, 5000);
}

// Close notification
function closeNotification() {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

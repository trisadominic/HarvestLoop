// Farmer orders JavaScript file to match the consumer orders UI/UX
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    console.log("Auth check - User role:", userRole);
    console.log("Auth check - Token:", token ? "Token exists" : "No token");
    
    // Make role check case-insensitive and more flexible
    if (!token) {
        console.log("Auth failed - No token - Redirecting to login");
        window.location.href = '/login.html';
        return;
    }
    
    if (userRole && userRole.toLowerCase() !== 'farmer' && userRole !== 'Farmer') {
        console.log("Auth failed - Not a farmer - Redirecting to login");
        console.log("Current role:", userRole);
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
        'pending': 'In Negotiation - Waiting for your response or customer action',
        'purchased': 'Successfully Purchased - Customer bought the product',
        'cancelled': 'Cancelled - Order rejected or cancelled during negotiation',
        'accepted': 'Accepted by You - Waiting for customer purchase',
        'declined': 'Declined by You - You rejected this order/deal',
        'expired': 'Deal Expired - No action taken before expiry'
    };
    return statusDescriptions[status] || status;
}

// Fetch orders from API
async function fetchOrders(statusFilter = '') {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
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
        let apiUrl = '/api/orders/my-orders?role=farmer';
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
                <button onclick="fetchOrders()" class="bg-[#608d58] hover:bg-green-700 text-white px-4 py-2 rounded-lg">
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
    const productName = order.productId?.name || order.productName || 'Unknown Product';
    const productImage = order.productId?.imageUrl || '/assets/default-product.jpg';
    
    // Get consumer info
    const consumerName = order.consumerId?.username || order.consumerName || 'Anonymous Customer';
    
    // Calculate total value
    const totalValue = order.price * order.quantity;
    
    // Price display
    const priceDisplay = isDeal ? 
        (order.originalPrice && order.price !== order.originalPrice ? 
            `<p class="text-lg font-semibold text-green-600">₹${order.price} <span class="text-sm line-through text-gray-400">₹${order.originalPrice}</span></p>` :
            `<p class="text-lg font-semibold text-gray-900">₹${order.price}</p>`) :
        `<p class="text-lg font-semibold text-gray-900">₹${order.price}</p>`;
    
    return `
        <div class="order-card ${order.status === 'cancelled' || order.status === 'declined' ? 'cancelled' : ''} bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200" onclick="showOrderDetails('${order._id}')">
            <div class="p-6 order-content">
                <!-- Order Header -->
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="text-2xl">
                            <i class="fas ${isDeal ? 'fa-handshake' : 'fa-shopping-basket'} ${getStatusColor(order.status)}"></i>
                        </div>
                        <div>
                            <h3 class="font-semibold text-gray-900">#${order._id.slice(-8).toUpperCase()}</h3>
                            <p class="text-sm text-gray-500">${orderDate} at ${orderTime}</p>
                            <p class="text-xs ${getStatusTextColor(order.status)} font-medium">
                                ${isDeal ? 'Deal Request' : 'Direct Purchase'} ${formatStatusText(order.status)}
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
                        <p class="text-sm text-gray-600">Customer: ${consumerName}</p>
                        ${isDeal && order.message ? `<p class="text-xs text-gray-500 italic">"${order.message}"</p>` : ''}
                    </div>
                    <div class="text-right">
                        ${priceDisplay}
                        <p class="text-sm text-gray-500">Total: ₹${totalValue.toFixed(2)}</p>
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
                            class="text-[#608d58] hover:text-green-700 text-sm font-medium">
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
        'pending': 'Pending',
        'accepted': 'Accepted',
        'purchased': 'Purchased',
        'cancelled': 'Cancelled',
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
                    <button onclick="event.stopPropagation(); acceptDeal('${order._id}')" 
                            class="text-green-600 hover:text-green-700 text-sm font-medium bg-green-50 px-3 py-1 rounded mr-2">
                        <i class="fas fa-check mr-1"></i>Accept
                    </button>
                    <button onclick="event.stopPropagation(); declineDeal('${order._id}')" 
                            class="text-red-600 hover:text-red-700 text-sm font-medium">
                        <i class="fas fa-times mr-1"></i>Decline
                    </button>
                `;
            case 'accepted':
                return `
                    <span class="text-green-600 text-sm">
                        <i class="fas fa-check-circle mr-1"></i>Awaiting Purchase
                    </span>
                `;
            case 'declined':
                return `
                    <span class="text-red-600 text-sm">
                        <i class="fas fa-times-circle mr-1"></i>You Declined This Deal
                    </span>
                `;
            case 'purchased':
                return `
                    <span class="text-blue-600 text-sm">
                        <i class="fas fa-check-circle mr-1"></i>Deal Completed
                    </span>
                `;
            case 'cancelled':
                return `
                    <span class="text-red-600 text-sm">
                        <i class="fas fa-times-circle mr-1"></i>Deal Cancelled by Customer
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
            case 'purchased':
                return `
                    <span class="text-green-600 text-sm">
                        <i class="fas fa-check-circle mr-1"></i>Order Completed
                    </span>
                `;
            case 'cancelled':
                return `
                    <span class="text-red-600 text-sm">
                        <i class="fas fa-times-circle mr-1"></i>Order Cancelled
                    </span>
                `;
            default:
                return '';
        }
    }
}

// Setup status filter dropdown
function setupStatusFilter() {
    const statusFilter = document.getElementById('statusFilter');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            fetchOrders(this.value);
        });
    }
}

// Show order details in modal
function showOrderDetails(orderId) {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('orderModal');
    const modalContent = document.getElementById('orderModalContent');
    
    if (!modal || !modalContent) return;
    
    const isDeal = order.type === 'deal';
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const orderTime = new Date(order.createdAt).toLocaleTimeString();
    
    const productName = order.productId?.name || order.productName || 'Unknown Product';
    const productImage = order.productId?.imageUrl || '/assets/default-product.jpg';
    const productDescription = order.productId?.description || 'No description available';
    
    const consumerName = order.consumerId?.username || order.consumerName || 'Anonymous Customer';
    const consumerContact = order.consumerId?.phone || 'Not provided';
    
    const totalValue = order.price * order.quantity;
    
    modalContent.innerHTML = `
        <div>
            <div class="flex items-center space-x-4 mb-6">
                <div class="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                    <img src="${productImage}" alt="${productName}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='/assets/default-product.jpg'">
                </div>
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${productName}</h3>
                    <p class="text-sm text-gray-600">${productDescription}</p>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <h4 class="text-sm font-medium text-gray-500 mb-2">ORDER INFORMATION</h4>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-600">Order ID:</span>
                            <span class="font-medium">#${order._id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-600">Date:</span>
                            <span>${orderDate} at ${orderTime}</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-600">Type:</span>
                            <span>${isDeal ? 'Deal Request' : 'Direct Purchase'}</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-600">Status:</span>
                            <span class="status-badge ${`status-${order.status}`} text-xs">
                                <i class="${getStatusIcon(order.status)} mr-1"></i>
                                ${formatStatusText(order.status)}
                            </span>
                        </div>
                        ${isDeal && order.message ? `
                        <div class="mt-3 pt-3 border-t border-gray-200">
                            <span class="text-gray-600 block mb-1">Customer Message:</span>
                            <span class="italic text-sm">"${order.message}"</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div>
                    <h4 class="text-sm font-medium text-gray-500 mb-2">CUSTOMER INFORMATION</h4>
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-600">Name:</span>
                            <span>${consumerName}</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span class="text-gray-600">Contact:</span>
                            <span>${consumerContact}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="bg-gray-50 rounded-lg p-4 mb-8">
                <h4 class="text-sm font-medium text-gray-500 mb-3">ORDER DETAILS</h4>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-800 font-medium">${productName}</span>
                    <span class="text-gray-800">₹${order.price} × ${order.quantity}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Quantity</span>
                    <span>${order.quantity}</span>
                </div>
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Unit Price</span>
                    <span>₹${order.price}</span>
                </div>
                ${isDeal && order.originalPrice && order.originalPrice !== order.price ? `
                <div class="flex justify-between py-2 border-b border-gray-200">
                    <span class="text-gray-600">Original Price</span>
                    <span class="line-through text-gray-500">₹${order.originalPrice}</span>
                </div>` : ''}
                <div class="flex justify-between py-3 font-bold">
                    <span>Total</span>
                    <span>₹${totalValue.toFixed(2)}</span>
                </div>
            </div>
            
            ${order.status === 'pending' && isDeal ? `
            <div class="flex space-x-4 justify-center">
                <button onclick="acceptDeal('${order._id}')" 
                        class="bg-[#608d58] text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    <i class="fas fa-check mr-2"></i>Accept Deal
                </button>
                <button onclick="declineDeal('${order._id}')" 
                        class="bg-white border border-red-500 text-red-600 px-6 py-2 rounded-lg hover:bg-red-50 transition-colors">
                    <i class="fas fa-times mr-2"></i>Decline Deal
                </button>
            </div>` : ''}
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Close the order details modal
function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle accepting a deal
async function acceptDeal(dealId) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (confirm('Are you sure you want to accept this deal?')) {
        try {
            const response = await fetch(`/api/orders/accept-deal/${dealId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('Deal accepted successfully!');
                closeOrderModal();
                fetchOrders(); // Refresh orders list
            } else {
                alert('Failed to accept deal: ' + (result.message || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Error accepting deal:', error);
            alert('Failed to accept deal. Please try again.');
        }
    }
}

// Handle declining a deal
async function declineDeal(dealId) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (confirm('Are you sure you want to decline this deal?')) {
        try {
            const response = await fetch(`/api/orders/decline-deal/${dealId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('Deal declined.');
                closeOrderModal();
                fetchOrders(); // Refresh orders list
            } else {
                alert('Failed to decline deal: ' + (result.message || 'Unknown error'));
            }
            
        } catch (error) {
            console.error('Error declining deal:', error);
            alert('Failed to decline deal. Please try again.');
        }
    }
}

// Profile dropdown functions
function setupProfileDropdown() {
    const profileButton = document.getElementById('profile-button');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (!profileButton || !profileDropdown) {
        console.log('Profile elements not found');
        return;
    }
    
    // Toggle dropdown on button click
    profileButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        profileDropdown.classList.toggle('hidden');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!profileButton.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            profileDropdown.classList.add('hidden');
        }
    });
}

// Logout function
function handleLogout() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to logout?')) {
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        
        // Redirect to login page
        window.location.href = '/login.html';
    }
}
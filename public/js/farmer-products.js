// Farmer Products Management JavaScript

let currentEditingProduct = null;

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Add product button
    document.getElementById('add-product-btn').addEventListener('click', () => {
        openProductModal();
    });

    // Cancel button in modal
    document.getElementById('cancel-product-btn').addEventListener('click', closeProductModal);

    // Product form submission
    document.getElementById('product-form').addEventListener('submit', handleProductSubmit);

    // AI Price Suggestion button
    document.getElementById('get-price-suggestion').addEventListener('click', handlePriceSuggestion);
}

// Load farmer's products
async function loadProducts() {
    try {
        const response = await fetch('/api/products', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();

        renderProductsTable(data.products);
    } catch (error) {
        console.error('Failed to load products:', error);
        alert('Failed to load products. Please try again.');
    }
}

// Render products table
function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = products.map(product => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="h-10 w-10 flex-shrink-0">
                        <img class="h-10 w-10 rounded-full object-cover" 
                            src="${product.imageUrl || '/assets/default-product.jpg'}" 
                            alt="${product.name}">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${product.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    ${product.category}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ₹${product.price.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${product.quantity}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${product.active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="editProduct('${product._id}')"
                    class="text-indigo-600 hover:text-indigo-900 mr-4">
                    Edit
                </button>
                <button onclick="toggleProductStatus('${product._id}', ${product.active})"
                    class="text-red-600 hover:text-red-900">
                    ${product.active ? 'Deactivate' : 'Activate'}
                </button>
            </td>
        </tr>
    `).join('');
}

// Open product modal
function openProductModal(product = null) {
    currentEditingProduct = product;
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('modal-title');

    // Set modal title
    title.textContent = product ? 'Edit Product' : 'Add New Product';

    // Fill form if editing
    if (product) {
        form.name.value = product.name;
        form.category.value = product.category;
        form.price.value = product.price;
        form.quantity.value = product.quantity;
        form.description.value = product.description;
    } else {
        form.reset();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close product modal
function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    currentEditingProduct = null;
    document.getElementById('product-form').reset();
}

// Handle product form submission
async function handleProductSubmit(event) {
    event.preventDefault();
    
    try {
        const formData = new FormData(event.target);
        const productData = {
            name: formData.get('name'),
            category: formData.get('category'),
            price: Number(formData.get('price')),
            quantity: Number(formData.get('quantity')),
            description: formData.get('description')
        };

        // Handle image upload
        const imageFile = formData.get('image');
        if (imageFile.size > 0) {
            const imageFormData = new FormData();
            imageFormData.append('image', imageFile);
            
            // Upload image first
            const imageUploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: imageFormData
            });
            
            if (!imageUploadResponse.ok) throw new Error('Failed to upload image');
            
            const { imageUrl } = await imageUploadResponse.json();
            productData.imageUrl = imageUrl;
        }

        // Create or update product
        const url = currentEditingProduct 
            ? `/api/products/${currentEditingProduct._id}`
            : '/api/products';
            
        const response = await fetch(url, {
            method: currentEditingProduct ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) throw new Error('Failed to save product');

        // Reload products and close modal
        closeProductModal();
        loadProducts();
        
        alert(`Product ${currentEditingProduct ? 'updated' : 'added'} successfully!`);
    } catch (error) {
        console.error('Failed to save product:', error);
        alert(error.message || 'Failed to save product. Please try again.');
    }
}

// Edit product
async function editProduct(productId) {
    try {
        const response = await fetch(`/api/products/${productId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch product details');
        
        const product = await response.json();
        openProductModal(product);
    } catch (error) {
        console.error('Failed to edit product:', error);
        alert(error.message || 'Failed to edit product. Please try again.');
    }
}

// Toggle product status (active/inactive)
async function toggleProductStatus(productId, currentStatus) {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this product?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ active: !currentStatus })
        });

        if (!response.ok) throw new Error('Failed to update product status');

        loadProducts();
        alert('Product status updated successfully!');
    } catch (error) {
        console.error('Failed to update product status:', error);
        alert(error.message || 'Failed to update product status. Please try again.');
    }
}

// Handle AI Price Suggestion
async function handlePriceSuggestion() {
    const nameField = document.querySelector('input[name="name"]');
    const priceField = document.querySelector('input[name="price"]');
    const button = document.getElementById('get-price-suggestion');
    
    if (!nameField.value) {
        alert('Please enter a product name first to get AI price suggestion.');
        nameField.focus();
        return;
    }

    try {
        // Show loading state
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Getting AI Suggestion...';
        
        const response = await fetch('/api/price-suggestion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productName: nameField.value })
        });

        const data = await response.json();

        if (data.error) {
            // Show user-friendly message if available
            const userMessage = data.userMessage || data.error || 'Our AI assistant is currently unavailable. Please set your price manually based on local market rates.';
            alert(userMessage);
            
            // Optionally suggest a fallback price if provided
            if (data.fallback_price) {
                const useApproximate = confirm(`Would you like to use an approximate price of ₹${data.fallback_price} as a starting point?`);
                if (useApproximate) {
                    priceField.value = data.fallback_price;
                    // Show visual feedback
                    const originalBorder = priceField.style.border;
                    priceField.style.border = '2px solid #F59E0B';
                    priceField.style.transition = 'border 0.3s ease';
                    setTimeout(() => {
                        priceField.style.border = originalBorder;
                    }, 2000);
                }
            }
        } else if (data.suggested_price) {
            // Ask user if they want to use the suggested price
            const usePrice = confirm(`🤖 AI suggests a price of ₹${data.suggested_price} for ${nameField.value}\n\nThis price is based on current market data and trends.\n\nWould you like to use this suggested price?\n\nClick OK to use this price, or Cancel to keep your current price.`);
            
            if (usePrice) {
                priceField.value = data.suggested_price;
                
                // Show success message with animation
                const originalBorder = priceField.style.border;
                priceField.style.border = '2px solid #10B981';
                priceField.style.transition = 'border 0.3s ease';
                
                setTimeout(() => {
                    priceField.style.border = originalBorder;
                }, 2000);
            }
            // If user cancels, nothing happens - keeps current price
        }
    } catch (error) {
        console.error('Price suggestion error:', error);
        alert('🌐 Connection issue! Please check your internet connection and try again, or set the price manually.');
    } finally {
        // Reset button state
        button.disabled = false;
        button.innerHTML = '<i class="fas fa-robot mr-1"></i> AI Suggest';
    }
}

// Check for new notifications periodically
setInterval(async () => {
    try {
        const response = await fetch('/api/notifications', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const notifications = await response.json();
        
        const unreadCount = notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to check notifications:', error);
    }
}, 30000); // Check every 30 seconds

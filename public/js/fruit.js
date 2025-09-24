document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');

    if (!userId || userRole !== 'Consumer') {
        window.location.href = '/login.html';
        return;
    }

    // Profile dropdown functionality
    setupProfileDropdown();

    // Example: Fetch fruit list with authentication
    const token = localStorage.getItem('token');
    fetch('/api/products/fruit', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      return response.json();
    })
    .then(data => {
      console.log('API Response:', data);
      
      // Hide loading state
      const loadingState = document.getElementById('loading-state');
      if (loadingState) {
        loadingState.style.display = 'none';
      }
      
      const fruitGrid = document.getElementById('fruit-grid');
      const fruitCount = document.getElementById('fruit-count');
      fruitGrid.innerHTML = '';
      
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', typeof data, data);
        fruitCount.textContent = 'Error loading fruits';
        return;
      }
      
      fruitCount.textContent = `Showing ${data.length} fruits`;

      data.forEach(fruit => {
        const card = document.createElement('div');
        card.className = 'fruit-card bg-white rounded-lg shadow-md p-6 flex gap-4';
        
        // Use actual farmer's image or a proper fallback
        const imageUrl = fruit.imageUrl && fruit.imageUrl !== '/assets/default-fruit.jpg' 
          ? fruit.imageUrl 
          : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23f97316"><circle cx="50" cy="50" r="40"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">🍎</text></svg>';
        
        card.innerHTML = `
          <div class="flex-1">
            <h2 class="text-xl font-bold mb-2">${fruit.name}</h2>
            <p class="text-gray-600 mb-2">Price: <span class="font-semibold">Rs. ${fruit.price}</span> / ${fruit.stockUnit || 'kg'}</p>
            <p class="text-gray-600 mb-2">Quantity: ${fruit.quantity}</p>
            <p class="text-gray-600 mb-2">${fruit.description}</p>
            <p class="text-sm text-gray-400 mb-4">Farmer: ${fruit.farmerId?.username || 'Unknown'}</p>
            
            <div class="flex gap-2">
              <button class="buy-btn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors" data-fruit-id="${fruit._id || fruit.id || 'unknown'}" data-fruit-name="${fruit.name}" data-fruit-price="${fruit.price}" data-fruit-unit="${fruit.stockUnit || 'kg'}" data-fruit-quantity="${fruit.quantity}">
                <i class="fas fa-shopping-cart mr-1"></i>Buy
              </button>
              <button class="deal-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors" data-fruit-id="${fruit._id || fruit.id || 'unknown'}" data-fruit-name="${fruit.name}" data-fruit-price="${fruit.price}" data-fruit-unit="${fruit.stockUnit || 'kg'}" data-fruit-quantity="${fruit.quantity}">
                <i class="fas fa-handshake mr-1"></i>Deal
              </button>
              <button class="farmer-btn bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors" data-farmer-id="${fruit.farmerId?._id || fruit.farmerId}" data-farmer-name="${fruit.farmerId?.username || 'Unknown'}" data-fruit-name="${fruit.name}">
                <i class="fas fa-user mr-1"></i>Farmer
              </button>
            </div>
          </div>
          <div class="w-32 h-32 flex-shrink-0">
            <img src="${imageUrl}" alt="${fruit.name}" class="w-full h-full object-cover rounded" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\' fill=\\'%23f97316\\'><circle cx=\\'50\\' cy=\\'50\\' r=\\'40\\'/><text x=\\'50\\' y=\\'60\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'40\\'>🍎</text></svg>'" />
          </div>
        `;
        fruitGrid.appendChild(card);
      });

      // Add event listeners for buy buttons
      document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Buy button clicked!');
          
          const fruitId = this.dataset.fruitId;
          const fruitName = this.dataset.fruitName;
          const fruitPrice = this.dataset.fruitPrice;
          const fruitUnit = this.dataset.fruitUnit;
          const fruitQuantity = this.dataset.fruitQuantity; // Available stock
          
          console.log('Fruit data:', { fruitId, fruitName, fruitPrice, fruitUnit, fruitQuantity });
          
          showPurchasePopup(fruitName, fruitPrice, fruitUnit, fruitId, fruitQuantity);
        });
      });

      // Add event listeners for deal buttons
      document.querySelectorAll('.deal-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Deal button clicked!');
          
          const fruitId = this.dataset.fruitId;
          const fruitName = this.dataset.fruitName;
          const fruitPrice = this.dataset.fruitPrice;
          const fruitUnit = this.dataset.fruitUnit;
          const fruitQuantity = this.dataset.fruitQuantity; // Available stock
          
          console.log('Deal data:', { fruitId, fruitName, fruitPrice, fruitUnit, fruitQuantity });
          
          showDealPopup(fruitName, fruitPrice, fruitUnit, fruitId, fruitQuantity);
        });
      });

      // Add event listeners for farmer buttons
      document.querySelectorAll('.farmer-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Farmer button clicked!');
          
          const farmerId = this.dataset.farmerId;
          const farmerName = this.dataset.farmerName;
          const fruitName = this.dataset.fruitName;
          
          console.log('Farmer data:', { farmerId, farmerName, fruitName });
          
          showFarmerModal(farmerId, farmerName, fruitName);
        });
      });
    })
    .catch(error => {
      console.error('Error fetching fruits:', error);
      
      // Hide loading state
      const loadingState = document.getElementById('loading-state');
      if (loadingState) {
        loadingState.style.display = 'none';
      }
      
      const fruitGrid = document.getElementById('fruit-grid');
      const fruitCount = document.getElementById('fruit-count');
      fruitCount.textContent = 'Error loading fruits';
      fruitGrid.innerHTML = '<div class="text-center text-red-500">Failed to load fruits. Please try again later.</div>';
    });

    // Handle reveal farmer button click
    const revealButtons = document.querySelectorAll('.reveal-farmer-btn');
    revealButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const productId = e.target.dataset.productId;
            try {
                const response = await fetch(`/api/products/reveal/${productId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = await response.json();
                
                if (response.ok) {
                    // Show farmer details
                    const farmerInfoDiv = document.querySelector(`#farmer-info-${productId}`);
                    farmerInfoDiv.innerHTML = `
                        <div class="bg-green-50 p-4 rounded-lg">
                            <h3 class="font-bold">Farmer Details</h3>
                            <p>Name: ${data.farmerName}</p>
                            <p>Phone: ${data.farmerPhone}</p>
                            <p>Location: ${data.location}</p>
                        </div>
                    `;
                    farmerInfoDiv.classList.remove('hidden');
                    
                    // Hide the reveal button
                    e.target.classList.add('hidden');
                } else {
                    if (data.message === 'Insufficient points') {
                        window.location.href = '/subscription.html';
                    } else {
                        alert(data.message || 'Failed to reveal farmer details');
                    }
                }
            } catch (error) {
                console.error('Error revealing farmer:', error);
                alert('An error occurred while revealing farmer details');
            }
        });
    });

    // Handle deal button click
    const dealButtons = document.querySelectorAll('.make-deal-btn');
    dealButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const productId = e.target.dataset.productId;
            const priceInput = document.querySelector(`#deal-price-${productId}`);
            const price = priceInput.value;

            if (!price || isNaN(price) || price <= 0) {
                alert('Please enter a valid price');
                return;
            }

            try {
                const response = await fetch('/api/deals', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        productId,
                        offeredPrice: price
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    alert('Offer sent successfully!');
                    // Disable the deal button and price input
                    e.target.disabled = true;
                    e.target.classList.add('bg-gray-400');
                    priceInput.disabled = true;
                } else {
                    if (data.message === 'Insufficient points') {
                        window.location.href = '/subscription.html';
                    } else {
                        alert(data.message || 'Failed to send offer');
                    }
                }
            } catch (error) {
                console.error('Error making deal:', error);
                alert('An error occurred while sending the offer');
            }
        });
    });
});

// Global variable to store escape key handler
let currentEscapeHandler = null;

// Purchase popup functionality
function showPurchasePopup(fruitName, fruitPrice, fruitUnit, fruitId, availableQuantity) {
  console.log('showPurchasePopup called with:', { fruitName, fruitPrice, fruitUnit, fruitId, availableQuantity });
  
  // Remove existing popup if any
  const existingPopup = document.getElementById('purchasePopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create new popup
  const popup = document.createElement('div');
  popup.id = 'purchasePopup';
  popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  popup.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Purchase ${fruitName}</h2>
        <button onclick="closePurchasePopup()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Confirm the quantity you wish to purchase at the list price of ₹${fruitPrice} / ${fruitUnit}.</p>
      <p class="text-sm text-blue-600 mb-4"><i class="fas fa-info-circle mr-1"></i>Available Stock: ${availableQuantity} ${fruitUnit}</p>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Quantity (${fruitUnit})</label>
        <input type="number" id="purchaseQuantity" value="1" min="1" max="${availableQuantity}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-green-500">
        <div id="quantityError" class="text-red-500 text-sm mt-1 hidden">
          <i class="fas fa-exclamation-triangle mr-1"></i>
          <span id="quantityErrorMessage"></span>
        </div>
      </div>
      
      <div class="bg-gray-100 rounded-lg p-4 mb-4">
        <h3 class="font-bold text-lg mb-2">Purchase Summary</h3>
        <div class="flex justify-between items-center">
          <span class="text-gray-700">Total Cost</span>
          <span id="totalCost" class="text-green-600 font-bold text-xl">₹${fruitPrice}</span>
        </div>
        <p class="text-sm text-gray-600 mt-2">By clicking 'Accept & Reveal', you agree to purchase this item. The farmer's contact details will be revealed to you to coordinate pickup/delivery.</p>
      </div>
      
      <div class="flex gap-3">
        <button onclick="closePurchasePopup()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors">
          Cancel
        </button>
        <button id="confirmButton" onclick="confirmPurchase('${fruitId}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
          Accept & Reveal Details
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Add click listener to close popup when clicking backdrop
  popup.addEventListener('click', function(e) {
    if (e.target === popup) {
      closePurchasePopup();
    }
  });
  
  // Add escape key listener
  currentEscapeHandler = function(e) {
    if (e.key === 'Escape') {
      closePurchasePopup();
    }
  };
  document.addEventListener('keydown', currentEscapeHandler);
  
  // Add quantity change listener after a short delay to ensure DOM is ready
  setTimeout(() => {
    const quantityInput = document.getElementById('purchaseQuantity');
    if (quantityInput) {
      quantityInput.addEventListener('input', function() {
        validateAndUpdateQuantity(fruitPrice, fruitUnit, availableQuantity);
      });
    }
  }, 100);
}

function closePurchasePopup() {
  const popup = document.getElementById('purchasePopup');
  if (popup) {
    // Remove any event listeners before removing the popup
    popup.remove();
  }
  
  // Remove escape key listener if it exists
  if (currentEscapeHandler) {
    document.removeEventListener('keydown', currentEscapeHandler);
    currentEscapeHandler = null;
  }
}

function updateTotalCost(pricePerUnit, unit) {
  const quantity = document.getElementById('purchaseQuantity').value;
  const total = (parseFloat(pricePerUnit) * parseInt(quantity)).toFixed(2);
  document.getElementById('totalCost').textContent = `₹${total}`;
}

function validateAndUpdateQuantity(pricePerUnit, unit, availableQuantity) {
  const quantityInput = document.getElementById('purchaseQuantity');
  const quantityError = document.getElementById('quantityError');
  const quantityErrorMessage = document.getElementById('quantityErrorMessage');
  const confirmButton = document.getElementById('confirmButton');
  const quantity = parseInt(quantityInput.value);
  
  // Hide error initially
  quantityError.classList.add('hidden');
  confirmButton.disabled = false;
  confirmButton.classList.remove('bg-gray-400', 'cursor-not-allowed');
  confirmButton.classList.add('bg-green-500', 'hover:bg-green-600');
  
  // Validate quantity
  if (quantity > availableQuantity) {
    // Show error message
    quantityErrorMessage.textContent = `Only ${availableQuantity} ${unit} available in stock. Please reduce the quantity.`;
    quantityError.classList.remove('hidden');
    
    // Disable confirm button
    confirmButton.disabled = true;
    confirmButton.classList.remove('bg-green-500', 'hover:bg-green-600');
    confirmButton.classList.add('bg-gray-400', 'cursor-not-allowed');
    
    // Change input border to red
    quantityInput.classList.remove('border-gray-300', 'focus:border-green-500');
    quantityInput.classList.add('border-red-500', 'focus:border-red-500');
  } else if (quantity <= 0) {
    // Show error for invalid quantity
    quantityErrorMessage.textContent = 'Quantity must be at least 1.';
    quantityError.classList.remove('hidden');
    
    // Disable confirm button
    confirmButton.disabled = true;
    confirmButton.classList.remove('bg-green-500', 'hover:bg-green-600');
    confirmButton.classList.add('bg-gray-400', 'cursor-not-allowed');
    
    // Change input border to red
    quantityInput.classList.remove('border-gray-300', 'focus:border-green-500');
    quantityInput.classList.add('border-red-500', 'focus:border-red-500');
  } else {
    // Valid quantity - reset input border
    quantityInput.classList.remove('border-red-500', 'focus:border-red-500');
    quantityInput.classList.add('border-gray-300', 'focus:border-green-500');
  }
  
  // Update total cost
  updateTotalCost(pricePerUnit, unit);
}

function confirmPurchase(fruitId) {
  const quantity = document.getElementById('purchaseQuantity').value;
  const token = localStorage.getItem('token');
  
  // Close the purchase popup
  closePurchasePopup();
  
  // Call the API to create purchase and get farmer details
  fetch(`/api/subscriptions/unlock-farmer/${fruitId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ quantity: parseInt(quantity) })
  })
  .then(response => response.json())
  .then(data => {
    if (data.farmer) {
      // Order was automatically accepted - show farmer details
      showSuccessPopup(data.farmer, quantity, data.pointsRemaining);
      
      // Show notification that order is accepted
      showNotification(`🎉 Order accepted! Order ID: ${data.orderId}. Points remaining: ${data.pointsRemaining}`);
      
      // Refresh the product list to show updated quantities/availability if product was updated
      if (data.productUpdated) {
        // Simply refresh silently in the background after user has had time to see farmer details
        setTimeout(() => {
          location.reload();
        }, 30000); // Wait 30 seconds to give user plenty of time to read farmer details
      }
    } else {
      // Handle errors (no subscription, no points, etc.)
      alert(data.message || 'Unable to process purchase. Please check your subscription.');
    }
  })
  .catch(error => {
    console.error('Error processing purchase:', error);
    alert('An error occurred while processing your purchase.');
  });
}

// Deal popup functionality
function showDealPopup(fruitName, fruitPrice, fruitUnit, fruitId, availableQuantity) {
  console.log('showDealPopup called with:', { fruitName, fruitPrice, fruitUnit, fruitId, availableQuantity });
  
  // Remove existing popup if any
  const existingPopup = document.getElementById('dealPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create new popup
  const popup = document.createElement('div');
  popup.id = 'dealPopup';
  popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  popup.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Negotiate for ${fruitName}</h2>
        <button onclick="closeDealPopup()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Propose a new price or send a message to the farmer. The list price is Rs.${fruitPrice} / ${fruitUnit}.</p>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Quantity (${fruitUnit})</label>
          <input type="number" id="dealQuantity" value="1" min="1" max="${availableQuantity}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
          <div id="dealQuantityError" class="text-red-500 text-xs mt-1 hidden">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            <span id="dealQuantityErrorMessage"></span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Your Offer (Rs. / ${fruitUnit})</label>
          <input type="number" id="dealPrice" value="${Math.round(fruitPrice * 0.9)}" min="1" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
        </div>
      </div>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Message (Optional)</label>
        <textarea id="dealMessage" rows="3" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" placeholder="e.g. I'd like to buy in bulk, can you do a better price?"></textarea>
      </div>
      
      <div class="bg-gray-100 rounded-lg p-4 mb-4">
        <h3 class="font-bold text-lg mb-2">Offer Summary</h3>
        <div class="flex justify-between items-center mb-2">
          <span>List Price Total</span>
          <span id="listPriceTotal">Rs.${fruitPrice}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-green-600 font-semibold">Your Offer Total</span>
          <span id="offerTotal" class="text-green-600 font-semibold">Rs.${Math.round(fruitPrice * 0.9)}</span>
        </div>
        <p class="text-sm text-gray-500 mt-2">The farmer will be notified of your offer. You can see their response in your messages.</p>
      </div>
      
      <div class="flex gap-3">
        <button onclick="closeDealPopup()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors">
          Cancel
        </button>
        <button id="sendOfferButton" onclick="sendDealOffer('${fruitId}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
          Send Offer
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Add real-time calculation updates
  const quantityInput = document.getElementById('dealQuantity');
  const priceInput = document.getElementById('dealPrice');
  
  function updateTotals() {
    const quantity = parseInt(quantityInput.value) || 1;
    const offerPrice = parseFloat(priceInput.value) || 0;
    const listPrice = parseFloat(fruitPrice);
    
    // Validate quantity
    const quantityError = document.getElementById('dealQuantityError');
    const quantityErrorMessage = document.getElementById('dealQuantityErrorMessage');
    
    if (quantity > availableQuantity) {
      quantityError.classList.remove('hidden');
      quantityErrorMessage.textContent = `Maximum available: ${availableQuantity} ${fruitUnit}`;
      quantityInput.value = availableQuantity;
      return;
    } else {
      quantityError.classList.add('hidden');
    }
    
    // Update totals
    document.getElementById('listPriceTotal').textContent = `Rs.${(listPrice * quantity).toFixed(2)}`;
    document.getElementById('offerTotal').textContent = `Rs.${(offerPrice * quantity).toFixed(2)}`;
  }
  
  quantityInput.addEventListener('input', updateTotals);
  priceInput.addEventListener('input', updateTotals);
  
  // Add click listener to close popup when clicking backdrop
  popup.addEventListener('click', function(e) {
    if (e.target === popup) {
      closeDealPopup();
    }
  });
  
  // Add escape key listener
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeDealPopup();
    }
  });
}

function closeDealPopup() {
  const popup = document.getElementById('dealPopup');
  if (popup) {
    popup.remove();
  }
}

function sendDealOffer(fruitId) {
  console.log('🎯 sendDealOffer called with fruitId:', fruitId);
  
  const quantity = document.getElementById('dealQuantity').value;
  const offerPrice = document.getElementById('dealPrice').value;
  const message = document.getElementById('dealMessage').value;
  const token = localStorage.getItem('token');
  
  console.log('📊 Deal data:', { quantity, offerPrice, message, tokenExists: !!token });
  
  // Validate inputs
  if (!quantity || quantity <= 0) {
    alert('Please enter a valid quantity');
    return;
  }
  
  if (!offerPrice || offerPrice <= 0) {
    alert('Please enter a valid offer price');
    return;
  }
  
  if (!token) {
    alert('Please login to send deal offers');
    return;
  }
  
  console.log('✅ Validation passed, sending request...');
  
  // Close the deal popup
  closeDealPopup();
  
  // Send deal offer to API
  console.log('📤 Making fetch request to /api/deals');
  fetch('/api/deals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      productId: fruitId,
      quantity: parseInt(quantity),
      proposedPrice: parseFloat(offerPrice),
      message: message || ''
    })
  })
  .then(response => {
    console.log('📥 Response received:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('❌ Response not OK:', response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  })
  .then(data => {
    console.log('✅ Response data:', data);
    
    if (data.success || data._id) {
      alert('🤝 Deal offer sent successfully! The farmer will be notified and you can see their response in your messages.');
    } else {
      console.error('❌ Deal creation failed:', data);
      alert(data.message || 'Unable to send deal offer. Please try again.');
    }
  })
  .catch(error => {
    console.error('❌ Error sending deal offer:', error);
    alert('An error occurred while sending your deal offer.');
  });
}

// Show pending approval popup
function showPendingApprovalPopup(orderId, quantity, pointsRemaining) {
  // Remove existing popup if any
  const existingPopup = document.getElementById('pendingPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'pendingPopup';
  popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  popup.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mr-3">
            <i class="fas fa-clock text-white text-xl"></i>
          </div>
          <h2 class="text-xl font-bold">Purchase Request Sent!</h2>
        </div>
        <button onclick="closePendingPopup()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Your purchase request has been sent to the farmer. You will receive farmer contact details once they accept your order.</p>
      
      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <h3 class="font-bold text-orange-700 mb-3">Order Details</h3>
        
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Order ID</span>
            <span class="font-medium">#${orderId.slice(-6).toUpperCase()}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Quantity</span>
            <span class="font-medium">${quantity}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-sm text-gray-600">Status</span>
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              <i class="fas fa-clock mr-1"></i>
              Pending Farmer Approval
            </span>
          </div>
        </div>
      </div>
      
      <div class="text-center mb-4">
        <button onclick="checkOrderStatus('${orderId}')" class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors mr-2">
          <i class="fas fa-sync mr-1"></i>Check Status
        </button>
        <button onclick="closePendingPopup()" class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
          Close
        </button>
      </div>
      
      <p class="text-xs text-gray-500 text-center">Points remaining: ${pointsRemaining}</p>
    </div>
  `;
  
  document.body.appendChild(popup);
}

// Close pending popup
function closePendingPopup() {
  const popup = document.getElementById('pendingPopup');
  if (popup) {
    popup.remove();
  }
}

// Check order status
function checkOrderStatus(orderId) {
  const token = localStorage.getItem('token');
  
  fetch(`/api/orders/${orderId}/farmer-details`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.farmer) {
      // Order was accepted - show farmer details
      closePendingPopup();
      showSuccessPopup(data.farmer, data.order.quantity, null);
      showNotification('Order accepted! Farmer details are now available.');
    } else {
      // Order still pending or was cancelled
      if (data.message.includes('not accepted yet')) {
        showNotification('Order is still pending farmer approval. Please check again later.');
      } else {
        showNotification('Order was cancelled by the farmer. Your subscription point has been refunded.');
        closePendingPopup();
      }
    }
  })
  .catch(error => {
    console.error('Error checking order status:', error);
    showNotification('Error checking order status. Please try again.');
  });
}

// Show success popup with farmer contact information
function showSuccessPopup(farmer, quantity, pointsRemaining) {
  // Remove existing success popup if any
  const existingPopup = document.getElementById('successPopup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  const popup = document.createElement('div');
  popup.id = 'successPopup';
  popup.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  popup.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-start mb-4">
        <div class="flex items-center">
          <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-3">
            <i class="fas fa-check text-white text-xl"></i>
          </div>
          <h2 class="text-xl font-bold">Purchase Accepted!</h2>
        </div>
        <button onclick="closeSuccessPopup()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Your order has been accepted! Please contact the farmer directly to coordinate payment and pickup/delivery.</p>
      
      <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <h3 class="font-bold text-green-700 mb-3">Farmer Contact Information</h3>
        
        <div class="space-y-2">
          <div class="flex items-center">
            <i class="fas fa-envelope text-green-600 w-5 mr-3"></i>
            <div>
              <span class="text-sm text-gray-600">Email</span>
              <p class="font-medium">${farmer.email || 'Not provided'}</p>
            </div>
          </div>
          
          <div class="flex items-center">
            <i class="fas fa-phone text-green-600 w-5 mr-3"></i>
            <div>
              <span class="text-sm text-gray-600">Phone</span>
              <p class="font-medium">${farmer.phone || 'Not provided'}</p>
            </div>
          </div>
          
          <div class="flex items-center">
            <i class="fas fa-user text-green-600 w-5 mr-3"></i>
            <div>
              <span class="text-sm text-gray-600">Farmer</span>
              <p class="font-medium">${farmer.username || 'Local Farmer'}</p>
            </div>
          </div>
          
          <div class="flex items-center">
            <i class="fas fa-home text-green-600 w-5 mr-3"></i>
            <div>
              <span class="text-sm text-gray-600">Farm Name</span>
              <p class="font-medium">${farmer.farmName || 'Not provided'}</p>
            </div>
          </div>
          
          <div class="flex items-start">
            <i class="fas fa-map-marker-alt text-green-600 w-5 mr-3 mt-1"></i>
            <div>
              <span class="text-sm text-gray-600">Farm Address</span>
              <p class="font-medium">${farmer.farmAddress || 'Address not provided'}</p>
              ${farmer.pincode && farmer.pincode !== 'Pincode not provided' ? `<p class="text-sm text-gray-500">PIN: ${farmer.pincode}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
      
      <div class="text-center">
        <button onclick="closeSuccessPopup()" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
           Close
        </button>
      </div>
      
      <p class="text-xs text-gray-500 text-center mt-3">Points remaining: ${pointsRemaining}</p>
    </div>
  `;
  
  document.body.appendChild(popup);
}

// Close success popup
function closeSuccessPopup() {
  console.log('closeSuccessPopup called'); // Debug log
  const popup = document.getElementById('successPopup');
  if (popup) {
    console.log('Popup found, removing...'); // Debug log
    popup.remove();
  } else {
    console.log('Popup not found'); // Debug log
    // Try alternative method - find popup by class
    const popupByClass = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
    if (popupByClass && popupByClass.id === 'successPopup') {
      popupByClass.remove();
    }
  }
}

// Show notification
function showNotification(message) {
  // Remove existing notification if any
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
  
  // Slide in animation
  setTimeout(() => {
    notification.classList.remove('translate-x-full');
  }, 100);
  
  // Auto close after 5 seconds
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

// Farmer Modal Functions
let currentFarmerId = null; // Store current farmer ID for reveal function

function showFarmerModal(farmerId, farmerName, fruitName) {
  console.log('showFarmerModal called with:', { farmerId, farmerName, fruitName });
  
  // Store farmer ID for later use
  currentFarmerId = farmerId;
  
  const modal = document.getElementById('farmerModal');
  const loadingState = document.getElementById('farmerLoadingState');
  const content = document.getElementById('farmerContent');
  const errorState = document.getElementById('farmerErrorState');
  
  // Reset modal state
  loadingState.classList.remove('hidden');
  content.classList.add('hidden');
  errorState.classList.add('hidden');
  
  // Reset contact section state
  document.getElementById('contactDetails').classList.add('hidden');
  document.getElementById('revealButtonContainer').classList.remove('hidden');
  
  // Show the modal
  modal.classList.remove('hidden');
  
  // Add click listener to close modal when clicking backdrop
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeFarmerModal();
    }
  });
  
  // Add escape key listener
  const escapeHandler = function(e) {
    if (e.key === 'Escape') {
      closeFarmerModal();
      document.removeEventListener('keydown', escapeHandler);
    }
  };
  document.addEventListener('keydown', escapeHandler);
  
  // Fetch farmer details from the API
  fetchFarmerDetails(farmerId);
}

function fetchFarmerDetails(farmerId) {
  const token = localStorage.getItem('token');
  
  fetch(`/api/farmers/${farmerId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Farmer details received:', data);
    displayFarmerDetails(data);
  })
  .catch(error => {
    console.error('Error fetching farmer details:', error);
    showFarmerError();
  });
}

function displayFarmerDetails(farmer) {
  const loadingState = document.getElementById('farmerLoadingState');
  const content = document.getElementById('farmerContent');
  
  // Hide loading state
  loadingState.classList.add('hidden');
  
  // Update farmer details in the new design
  document.getElementById('farmNameTitle').textContent = farmer.farmName || 'Farm Name Not Available';
  document.getElementById('farmLocation').textContent = `${farmer.farmAddress || 'Address not provided'}${farmer.pincode ? ', ' + farmer.pincode : ''}`;
  
  // Set a default description or customize based on farm
  document.getElementById('farmDescription').textContent = 
    `A dedicated farm committed to providing fresh, quality produce. Learn more by revealing contact information.`;
  
  // Store contact details for later reveal
  document.getElementById('farmerEmail').textContent = farmer.email || 'Not available';
  document.getElementById('farmerPhone').textContent = farmer.phone || 'Not available';
  document.getElementById('farmerAddress').textContent = farmer.farmAddress || 'Address not provided';
  document.getElementById('farmerCityState').textContent = farmer.pincode ? `PIN: ${farmer.pincode}` : '';
  
  // Show content
  content.classList.remove('hidden');
}

function revealFarmerContact() {
  const token = localStorage.getItem('token');
  
  if (!currentFarmerId) {
    alert('Error: Farmer information not available');
    return;
  }
  
  // Disable the reveal button and show loading
  const revealBtn = document.getElementById('revealContactBtn');
  const originalText = revealBtn.innerHTML;
  revealBtn.disabled = true;
  revealBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Revealing...';
  revealBtn.classList.remove('hover:bg-green-600');
  revealBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
  
  // Call the subscription API to unlock farmer details (uses existing endpoint)
  fetch(`/api/subscriptions/unlock-farmer-info/${currentFarmerId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Hide reveal button and show contact details
      document.getElementById('revealButtonContainer').classList.add('hidden');
      document.getElementById('contactDetails').classList.remove('hidden');
      
      // Show success notification
      showNotification(`✅ Contact revealed! Points remaining: ${data.pointsRemaining || 'N/A'}`);
    } else {
      // Handle errors
      if (data.message === 'Insufficient points' || data.message === 'No points remaining') {
        alert('❌ Insufficient subscription points. Please upgrade your subscription to reveal contact details.');
        // Optionally redirect to subscription page
        // window.location.href = '/subscription.html';
      } else if (data.message === 'Active subscription required') {
        alert('❌ Active subscription required to reveal contact details.');
        // window.location.href = '/subscription.html';
      } else {
        alert(data.message || '❌ Unable to reveal contact details. Please try again.');
      }
      
      // Restore button state
      revealBtn.disabled = false;
      revealBtn.innerHTML = originalText;
      revealBtn.classList.add('hover:bg-green-600');
      revealBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
    }
  })
  .catch(error => {
    console.error('Error revealing farmer contact:', error);
    alert('❌ An error occurred while revealing contact details.');
    
    // Restore button state
    revealBtn.disabled = false;
    revealBtn.innerHTML = originalText;
    revealBtn.classList.add('hover:bg-green-600');
    revealBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
  });
}

function showFarmerError() {
  const loadingState = document.getElementById('farmerLoadingState');
  const errorState = document.getElementById('farmerErrorState');
  
  // Hide loading state
  loadingState.classList.add('hidden');
  
  // Show error state
  errorState.classList.remove('hidden');
}

function closeFarmerModal() {
  const modal = document.getElementById('farmerModal');
  modal.classList.add('hidden');
  
  // Reset current farmer ID
  currentFarmerId = null;
  
  // Remove any event listeners
  const newModal = modal.cloneNode(true);
  modal.parentNode.replaceChild(newModal, modal);
}

// Profile Dropdown Functions
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
    
    const isVisible = !profileDropdown.classList.contains('hidden');
    
    if (isVisible) {
      // Hide dropdown with animation
      profileDropdown.style.transform = 'translateY(-10px)';
      profileDropdown.style.opacity = '0';
      setTimeout(() => {
        profileDropdown.classList.add('hidden');
        profileDropdown.style.transform = '';
        profileDropdown.style.opacity = '';
      }, 200);
    } else {
      // Show dropdown with animation
      profileDropdown.classList.remove('hidden');
      profileDropdown.style.transform = 'translateY(-10px)';
      profileDropdown.style.opacity = '0';
      setTimeout(() => {
        profileDropdown.style.transform = 'translateY(0)';
        profileDropdown.style.opacity = '1';
      }, 10);
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!profileButton.contains(e.target) && !profileDropdown.contains(e.target)) {
      if (!profileDropdown.classList.contains('hidden')) {
        profileDropdown.style.transform = 'translateY(-10px)';
        profileDropdown.style.opacity = '0';
        setTimeout(() => {
          profileDropdown.classList.add('hidden');
          profileDropdown.style.transform = '';
          profileDropdown.style.opacity = '';
        }, 200);
      }
    }
  });
  
  // Close dropdown on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (!profileDropdown.classList.contains('hidden')) {
        profileDropdown.style.transform = 'translateY(-10px)';
        profileDropdown.style.opacity = '0';
        setTimeout(() => {
          profileDropdown.classList.add('hidden');
          profileDropdown.style.transform = '';
          profileDropdown.style.opacity = '';
        }, 200);
      }
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
    
    // Show logout message
    showNotification('👋 Logged out successfully!');
    
    // Redirect to login page after a short delay
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
  }
}

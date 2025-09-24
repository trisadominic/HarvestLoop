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

    // Example: Fetch coffee list with authentication
    const token = localStorage.getItem('token');
    fetch('/api/products/coffee', {
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
      
      const coffeeGrid = document.getElementById('coffee-grid');
      const coffeeCount = document.getElementById('coffee-count');
      coffeeGrid.innerHTML = '';
      
      if (!Array.isArray(data)) {
        console.error('Expected array but got:', typeof data, data);
        coffeeCount.textContent = 'Error loading coffee products';
        return;
      }
      
      coffeeCount.textContent = `Showing ${data.length} coffee products`;

      data.forEach(coffee => {
        const card = document.createElement('div');
        card.className = 'coffee-card bg-white rounded-lg shadow-md p-6 flex gap-4';
        
        // Use actual farmer's image or a proper fallback
        const imageUrl = coffee.imageUrl && coffee.imageUrl !== '/assets/default-coffee.jpg' 
          ? coffee.imageUrl 
          : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23f97316"><circle cx="50" cy="50" r="40"/><text x="50" y="60" text-anchor="middle" fill="white" font-size="40">☕</text></svg>';
        
        card.innerHTML = `
          <div class="flex-1">
            <h2 class="text-xl font-bold mb-2">${coffee.name}</h2>
            <p class="text-gray-600 mb-2">Price: <span class="font-semibold">Rs. ${coffee.price}</span> / ${coffee.stockUnit || 'kg'}</p>
            <p class="text-gray-600 mb-2">Quantity: ${coffee.quantity}</p>
            <p class="text-gray-600 mb-2">${coffee.description}</p>
            <p class="text-sm text-gray-400 mb-4">Farmer: ${coffee.farmerId?.username || 'Unknown'}</p>
            
            <div class="flex gap-2">
              <button class="buy-btn bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors" data-coffee-id="${coffee._id || coffee.id || 'unknown'}" data-coffee-name="${coffee.name}" data-coffee-price="${coffee.price}" data-coffee-unit="${coffee.stockUnit || 'kg'}" data-coffee-quantity="${coffee.quantity}">
                <i class="fas fa-shopping-cart mr-1"></i>Buy
              </button>
              <button class="deal-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors" data-coffee-id="${coffee._id || coffee.id || 'unknown'}" data-coffee-name="${coffee.name}" data-coffee-price="${coffee.price}" data-coffee-unit="${coffee.stockUnit || 'kg'}" data-coffee-quantity="${coffee.quantity}">
                <i class="fas fa-handshake mr-1"></i>Deal
              </button>
              <button class="farmer-btn bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors" data-farmer-id="${coffee.farmerId?._id || coffee.farmerId}" data-farmer-name="${coffee.farmerId?.username || 'Unknown'}" data-coffee-name="${coffee.name}">
                <i class="fas fa-user mr-1"></i>Farmer
              </button>
            </div>
          </div>
          <div class="w-32 h-32 flex-shrink-0">
            <img src="${imageUrl}" alt="${coffee.name}" class="w-full h-full object-cover rounded" 
                 onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\' fill=\\'%23f97316\\'><circle cx=\\'50\\' cy=\\'50\\' r=\\'40\\'/><text x=\\'50\\' y=\\'60\\' text-anchor=\\'middle\\' fill=\\'white\\' font-size=\\'40\\'>☕</text></svg>'" />
          </div>
        `;
        coffeeGrid.appendChild(card);
      });

      // Add event listeners for buy buttons
      document.querySelectorAll('.buy-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Buy button clicked!');
          
          const coffeeId = this.dataset.coffeeId;
          const coffeeName = this.dataset.coffeeName;
          const coffeePrice = this.dataset.coffeePrice;
          const coffeeUnit = this.dataset.coffeeUnit;
          const coffeeQuantity = this.dataset.coffeeQuantity; // Available stock
          
          console.log('Coffee data:', { coffeeId, coffeeName, coffeePrice, coffeeUnit, coffeeQuantity });
          
          showPurchasePopup(coffeeName, coffeePrice, coffeeUnit, coffeeId, coffeeQuantity);
        });
      });

      // Add event listeners for deal buttons
      document.querySelectorAll('.deal-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Deal button clicked!');
          
          const coffeeId = this.dataset.coffeeId;
          const coffeeName = this.dataset.coffeeName;
          const coffeePrice = this.dataset.coffeePrice;
          const coffeeUnit = this.dataset.coffeeUnit;
          const coffeeQuantity = this.dataset.coffeeQuantity; // Available stock
          
          console.log('Deal data:', { coffeeId, coffeeName, coffeePrice, coffeeUnit, coffeeQuantity });
          
          showDealPopup(coffeeName, coffeePrice, coffeeUnit, coffeeId, coffeeQuantity);
        });
      });

      // Add event listeners for farmer buttons
      document.querySelectorAll('.farmer-btn').forEach(button => {
        button.addEventListener('click', function(e) {
          e.preventDefault();
          console.log('Farmer button clicked!');
          
          const farmerId = this.dataset.farmerId;
          const farmerName = this.dataset.farmerName;
          const coffeeName = this.dataset.coffeeName;
          
          console.log('Farmer data:', { farmerId, farmerName, coffeeName });
          
          showFarmerModal(farmerId, farmerName, coffeeName);
        });
      });
    })
    .catch(error => {
      console.error('Error fetching coffee products:', error);
      
      // Hide loading state
      const loadingState = document.getElementById('loading-state');
      if (loadingState) {
        loadingState.style.display = 'none';
      }
      
      const coffeeGrid = document.getElementById('coffee-grid');
      const coffeeCount = document.getElementById('coffee-count');
      coffeeCount.textContent = 'Error loading coffee products';
      coffeeGrid.innerHTML = '<div class="text-center text-red-500">Failed to load coffee products. Please try again later.</div>';
    });
});

// Global variable to store escape key handler
let currentEscapeHandler = null;

// Purchase popup functionality
function showPurchasePopup(coffeeName, coffeePrice, coffeeUnit, coffeeId, availableQuantity) {
  console.log('showPurchasePopup called with:', { coffeeName, coffeePrice, coffeeUnit, coffeeId, availableQuantity });
  
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
        <h2 class="text-xl font-bold">Purchase ${coffeeName}</h2>
        <button onclick="closePurchasePopup()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Confirm the quantity you wish to purchase at the list price of ₹${coffeePrice} / ${coffeeUnit}.</p>
      <p class="text-sm text-blue-600 mb-4"><i class="fas fa-info-circle mr-1"></i>Available Stock: ${availableQuantity} ${coffeeUnit}</p>
      
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-2">Quantity (${coffeeUnit})</label>
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
          <span id="totalCost" class="text-green-600 font-bold text-xl">₹${coffeePrice}</span>
        </div>
        <p class="text-sm text-gray-600 mt-2">By clicking 'Accept & Reveal', you agree to purchase this item. The farmer's contact details will be revealed to you to coordinate pickup/delivery.</p>
      </div>
      
      <div class="flex gap-3">
        <button onclick="closePurchasePopup()" class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors">
          Cancel
        </button>
        <button id="confirmButton" onclick="confirmPurchase('${coffeeId}')" class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
          Accept & Reveal Details
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(popup);
  
  // Add quantity change listener
  setTimeout(() => {
    const quantityInput = document.getElementById('purchaseQuantity');
    if (quantityInput) {
      quantityInput.addEventListener('input', function() {
        validateAndUpdateQuantity(coffeePrice, coffeeUnit, availableQuantity);
      });
    }
  }, 100);
}

function closePurchasePopup() {
  const popup = document.getElementById('purchasePopup');
  if (popup) {
    popup.remove();
  }
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
    quantityErrorMessage.textContent = `Only ${availableQuantity} ${unit} available in stock. Please reduce the quantity.`;
    quantityError.classList.remove('hidden');
    confirmButton.disabled = true;
    confirmButton.classList.remove('bg-green-500', 'hover:bg-green-600');
    confirmButton.classList.add('bg-gray-400', 'cursor-not-allowed');
  } else if (quantity <= 0) {
    quantityErrorMessage.textContent = 'Quantity must be at least 1.';
    quantityError.classList.remove('hidden');
    confirmButton.disabled = true;
    confirmButton.classList.remove('bg-green-500', 'hover:bg-green-600');
    confirmButton.classList.add('bg-gray-400', 'cursor-not-allowed');
  }
  
  // Update total cost
  const total = (parseFloat(pricePerUnit) * parseInt(quantity)).toFixed(2);
  document.getElementById('totalCost').textContent = `₹${total}`;
}

function confirmPurchase(coffeeId) {
  const quantity = document.getElementById('purchaseQuantity').value;
  const token = localStorage.getItem('token');
  
  closePurchasePopup();
  
  fetch(`/api/subscriptions/unlock-farmer/${coffeeId}`, {
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
      showSuccessPopup(data.farmer, quantity, data.pointsRemaining);
      showNotification(`🎉 Order accepted! Order ID: ${data.orderId}. Points remaining: ${data.pointsRemaining}`);
      if (data.productUpdated) {
        // Simply refresh silently in the background after user has had time to see farmer details
        setTimeout(() => {
          location.reload();
        }, 30000); // Wait 30 seconds to give user plenty of time to read farmer details
      }
    } else {
      alert(data.message || 'Unable to process purchase. Please check your subscription.');
    }
  })
  .catch(error => {
    console.error('Error processing purchase:', error);
    alert('An error occurred while processing your purchase.');
  });
}

// Deal popup functionality
function showDealPopup(coffeeName, coffeePrice, coffeeUnit, coffeeId, availableQuantity) {
  console.log('showDealPopup called with:', { coffeeName, coffeePrice, coffeeUnit, coffeeId, availableQuantity });
  
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
        <h2 class="text-xl font-bold">Negotiate for ${coffeeName}</h2>
        <button onclick="closeDealPopup()" class="text-gray-500 hover:text-gray-700">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      
      <p class="text-gray-600 mb-4">Propose a new price or send a message to the farmer. The list price is Rs.${coffeePrice} / ${coffeeUnit}.</p>
      
      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Quantity (${coffeeUnit})</label>
          <input type="number" id="dealQuantity" value="1" min="1" max="${availableQuantity}" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
          <div id="dealQuantityError" class="text-red-500 text-xs mt-1 hidden">
            <i class="fas fa-exclamation-triangle mr-1"></i>
            <span id="dealQuantityErrorMessage"></span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Your Offer (Rs. / ${coffeeUnit})</label>
          <input type="number" id="dealPrice" value="${Math.round(coffeePrice * 0.9)}" min="1" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
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
          <span id="listPriceTotal">Rs.${coffeePrice}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-green-600 font-semibold">Your Offer Total</span>
          <span id="offerTotal" class="text-green-600 font-semibold">Rs.${Math.round(coffeePrice * 0.9)}</span>
        </div>
        <p class="text-sm text-gray-500 mt-2">The farmer will be notified of your offer. You can see their response in your messages.</p>
      </div>
      
      <div class="flex gap-3">
        <button onclick="closeDealPopup()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors">
          Cancel
        </button>
        <button id="sendOfferButton" onclick="sendDealOffer('${coffeeId}')" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-colors">
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
    const listPrice = parseFloat(coffeePrice);
    
    // Validate quantity
    const quantityError = document.getElementById('dealQuantityError');
    const quantityErrorMessage = document.getElementById('dealQuantityErrorMessage');
    
    if (quantity > availableQuantity) {
      quantityError.classList.remove('hidden');
      quantityErrorMessage.textContent = `Maximum available: ${availableQuantity} ${coffeeUnit}`;
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
}

function closeDealPopup() {
  const popup = document.getElementById('dealPopup');
  if (popup) {
    popup.remove();
  }
}

function sendDealOffer(coffeeId) {
  const quantity = document.getElementById('dealQuantity').value;
  const offerPrice = document.getElementById('dealPrice').value;
  const message = document.getElementById('dealMessage').value;
  const token = localStorage.getItem('token');
  
  if (!quantity || quantity <= 0) {
    alert('Please enter a valid quantity');
    return;
  }
  
  if (!offerPrice || offerPrice <= 0) {
    alert('Please enter a valid offer price');
    return;
  }
  
  closeDealPopup();
  
  fetch('/api/deals', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      productId: coffeeId,
      quantity: parseInt(quantity),
      proposedPrice: parseFloat(offerPrice),
      message: message || ''
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success || data._id) {
      alert('🤝 Deal offer sent successfully! The farmer will be notified and you can see their response in your messages.');
    } else {
      alert(data.message || 'Unable to send deal offer. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error sending deal offer:', error);
    alert('An error occurred while sending your deal offer.');
  });
}

// Show success popup with farmer contact information
function showSuccessPopup(farmer, quantity, pointsRemaining) {
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
  const existingNotification = document.getElementById('notification');
  if (existingNotification) existingNotification.remove();
  
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
  
  setTimeout(() => notification.classList.remove('translate-x-full'), 100);
  setTimeout(() => closeNotification(), 5000);
}

function closeNotification() {
  const notification = document.getElementById('notification');
  if (notification) {
    notification.classList.add('translate-x-full');
    setTimeout(() => notification.remove(), 300);
  }
}

// Farmer Modal Functions
let currentFarmerId = null;

function showFarmerModal(farmerId, farmerName, coffeeName) {
  currentFarmerId = farmerId;
  
  const modal = document.getElementById('farmerModal');
  const loadingState = document.getElementById('farmerLoadingState');
  const content = document.getElementById('farmerContent');
  const errorState = document.getElementById('farmerErrorState');
  
  loadingState.classList.remove('hidden');
  content.classList.add('hidden');
  errorState.classList.add('hidden');
  
  document.getElementById('contactDetails').classList.add('hidden');
  document.getElementById('revealButtonContainer').classList.remove('hidden');
  
  modal.classList.remove('hidden');
  
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
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  .then(data => {
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
  
  loadingState.classList.add('hidden');
  
  document.getElementById('farmNameTitle').textContent = farmer.farmName || 'Farm Name Not Available';
  document.getElementById('farmLocation').textContent = `${farmer.farmAddress || 'Address not provided'}${farmer.pincode ? ', ' + farmer.pincode : ''}`;
  document.getElementById('farmDescription').textContent = 'A dedicated farm committed to providing fresh, quality produce. Learn more by revealing contact information.';
  
  document.getElementById('farmerEmail').textContent = farmer.email || 'Not available';
  document.getElementById('farmerPhone').textContent = farmer.phone || 'Not available';
  document.getElementById('farmerAddress').textContent = farmer.farmAddress || 'Address not provided';
  document.getElementById('farmerCityState').textContent = farmer.pincode ? `PIN: ${farmer.pincode}` : '';
  
  content.classList.remove('hidden');
}

function revealFarmerContact() {
  const token = localStorage.getItem('token');
  
  if (!currentFarmerId) {
    alert('Error: Farmer information not available');
    return;
  }
  
  const revealBtn = document.getElementById('revealContactBtn');
  const originalText = revealBtn.innerHTML;
  revealBtn.disabled = true;
  revealBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Revealing...';
  
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
      document.getElementById('revealButtonContainer').classList.add('hidden');
      document.getElementById('contactDetails').classList.remove('hidden');
      showNotification(`✅ Contact revealed! Points remaining: ${data.pointsRemaining || 'N/A'}`);
    } else {
      alert(data.message || '❌ Unable to reveal contact details. Please try again.');
      revealBtn.disabled = false;
      revealBtn.innerHTML = originalText;
    }
  })
  .catch(error => {
    console.error('Error revealing farmer contact:', error);
    alert('❌ An error occurred while revealing contact details.');
    revealBtn.disabled = false;
    revealBtn.innerHTML = originalText;
  });
}

function showFarmerError() {
  const loadingState = document.getElementById('farmerLoadingState');
  const errorState = document.getElementById('farmerErrorState');
  
  loadingState.classList.add('hidden');
  errorState.classList.remove('hidden');
}

function closeFarmerModal() {
  const modal = document.getElementById('farmerModal');
  modal.classList.add('hidden');
  currentFarmerId = null;
}

// Profile Dropdown Functions
function setupProfileDropdown() {
  const profileButton = document.getElementById('profile-button');
  const profileDropdown = document.getElementById('profile-dropdown');
  
  if (!profileButton || !profileDropdown) return;
  
  profileButton.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const isVisible = !profileDropdown.classList.contains('hidden');
    
    if (isVisible) {
      profileDropdown.style.transform = 'translateY(-10px)';
      profileDropdown.style.opacity = '0';
      setTimeout(() => {
        profileDropdown.classList.add('hidden');
        profileDropdown.style.transform = '';
        profileDropdown.style.opacity = '';
      }, 200);
    } else {
      profileDropdown.classList.remove('hidden');
      profileDropdown.style.transform = 'translateY(-10px)';
      profileDropdown.style.opacity = '0';
      setTimeout(() => {
        profileDropdown.style.transform = 'translateY(0)';
        profileDropdown.style.opacity = '1';
      }, 10);
    }
  });
  
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
}

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

// Product card component for displaying farmer products
class ProductCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['product-data'];
    }

    connectedCallback() {
        this.render();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'product-data' && oldValue !== newValue) {
            this.render();
        }
    }

    async render() {
        const product = JSON.parse(this.getAttribute('product-data'));
        
        this.shadowRoot.innerHTML = `
            <style>
                .card {
                    background: white;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    margin-bottom: 1rem;
                }
                .product-image {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    border-radius: 0.25rem;
                }
                .product-info {
                    margin-top: 1rem;
                }
                .product-title {
                    font-size: 1.25rem;
                    font-weight: bold;
                    margin-bottom: 0.5rem;
                }
                .product-price {
                    color: #4CAF50;
                    font-weight: bold;
                    font-size: 1.1rem;
                }
                .product-quantity {
                    color: #666;
                    margin-bottom: 1rem;
                }
                .button-group {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.5rem;
                    margin-top: 1rem;
                }
                button {
                    padding: 0.5rem;
                    border: none;
                    border-radius: 0.25rem;
                    cursor: pointer;
                    font-weight: bold;
                    transition: background-color 0.2s;
                }
                .purchase-btn {
                    background-color: #4CAF50;
                    color: white;
                }
                .deal-btn {
                    background-color: #FFA726;
                    color: white;
                }
                .farmer-btn {
                    background-color: #42A5F5;
                    color: white;
                }
                button:hover {
                    opacity: 0.9;
                }
                button:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
            </style>
            
            <div class="card">
                <img class="product-image" src="${product.imageUrl || '/assets/default-product.jpg'}" alt="${product.name}">
                <div class="product-info">
                    <div class="product-title">${product.name}</div>
                    <div class="product-price">₹${product.price.toFixed(2)} per ${product.stockUnit || 'unit'}</div>
                    <div class="product-quantity">Available: ${product.quantity} ${product.stockUnit || 'units'}</div>
                    <p>${product.description}</p>
                    <div class="button-group">
                        <button class="purchase-btn" ?disabled="${product.quantity === 0}">
                            Purchase
                        </button>
                        <button class="deal-btn" ?disabled="${product.quantity === 0}">
                            Deal
                        </button>
                        <button class="farmer-btn">
                            Farmer
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners
        this.shadowRoot.querySelector('.purchase-btn').addEventListener('click', () => this.handlePurchase(product));
        this.shadowRoot.querySelector('.deal-btn').addEventListener('click', () => this.handleDeal(product));
        this.shadowRoot.querySelector('.farmer-btn').addEventListener('click', () => this.handleFarmerDetails(product));
    }

    async handlePurchase(product) {
        try {
            // Show quantity input dialog
            const quantity = await this.showQuantityDialog(product);
            if (!quantity) return;

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    productId: product._id,
                    quantity
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Show success message
            alert('Purchase successful! Check your orders page for details.');
            this.dispatchEvent(new CustomEvent('purchase-complete'));
        } catch (error) {
            alert(error.message || 'Failed to complete purchase');
        }
    }

    async handleDeal(product) {
        try {
            // Show deal dialog for quantity and price
            const deal = await this.showDealDialog(product);
            if (!deal) return;

            const response = await fetch('/api/deals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    productId: product._id,
                    quantity: deal.quantity,
                    proposedPrice: deal.price
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            alert('Deal proposed successfully! The farmer will be notified.');
            this.dispatchEvent(new CustomEvent('deal-proposed'));
        } catch (error) {
            alert(error.message || 'Failed to propose deal');
        }
    }

    async handleFarmerDetails(product) {
        try {
            // Check if farmer details are already unlocked
            const isUnlocked = product.unlockedBy?.includes(localStorage.getItem('userId'));
            
            if (!isUnlocked) {
                // Confirm point deduction
                if (!confirm('Viewing farmer details will cost 1 point. Continue?')) {
                    return;
                }
            }

            const response = await fetch(`/api/subscriptions/unlock-farmer/${product._id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Show farmer details dialog
            this.showFarmerDetailsDialog(data.farmer);
        } catch (error) {
            if (error.message.includes('subscription')) {
                if (confirm('You need an active subscription to view farmer details. Purchase now?')) {
                    window.location.href = '/subscription.html';
                }
            } else {
                alert(error.message || 'Failed to get farmer details');
            }
        }
    }

    showQuantityDialog(product) {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            const unit = product.stockUnit || 'units';
            dialog.innerHTML = `
                <form method="dialog">
                    <h2>Enter Quantity</h2>
                    <p>Available: ${product.quantity} ${unit}</p>
                    <input type="number" min="1" max="${product.quantity}" value="1" required>
                    <div>
                        <button type="submit">Confirm</button>
                        <button type="button" onclick="this.closest('dialog').close()">Cancel</button>
                    </div>
                </form>
            `;
            
            dialog.addEventListener('close', () => {
                const quantity = Number(dialog.querySelector('input').value);
                resolve(quantity > 0 ? quantity : null);
                dialog.remove();
            });

            document.body.appendChild(dialog);
            dialog.showModal();
        });
    }

    showDealDialog(product) {
        return new Promise((resolve) => {
            const dialog = document.createElement('dialog');
            const unit = product.stockUnit || 'units';
            dialog.innerHTML = `
                <form method="dialog">
                    <h2>Propose Deal</h2>
                    <p>Available: ${product.quantity} ${unit}</p>
                    <p>Current Price: ₹${product.price} per ${product.stockUnit || 'unit'}</p>
                    <div>
                        <label>Quantity:</label>
                        <input type="number" name="quantity" min="1" max="${product.quantity}" value="1" required>
                    </div>
                    <div>
                        <label>Proposed Price per ${product.stockUnit || 'unit'}:</label>
                        <input type="number" name="price" min="1" value="${Math.floor(product.price * 0.9)}" required>
                    </div>
                    <div>
                        <button type="submit">Propose Deal</button>
                        <button type="button" onclick="this.closest('dialog').close()">Cancel</button>
                    </div>
                </form>
            `;
            
            dialog.addEventListener('close', () => {
                const form = dialog.querySelector('form');
                const quantity = Number(form.quantity.value);
                const price = Number(form.price.value);
                resolve(quantity > 0 && price > 0 ? { quantity, price } : null);
                dialog.remove();
            });

            document.body.appendChild(dialog);
            dialog.showModal();
        });
    }

    showFarmerDetailsDialog(farmer) {
        const dialog = document.createElement('dialog');
        dialog.innerHTML = `
            <div>
                <h2>${farmer.username}</h2>
                <p>Phone: ${farmer.phone}</p>
                <p>Email: ${farmer.email}</p>
                <button onclick="this.closest('dialog').close()">Close</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.showModal();

        dialog.addEventListener('close', () => dialog.remove());
    }
}

customElements.define('product-card', ProductCard);

// Initialize the product listing
async function initializeProductListing() {
    try {
        const response = await fetch('/api/products');
        const data = await response.json();
        
        const productGrid = document.querySelector('#product-grid');
        data.products.forEach(product => {
            const card = document.createElement('product-card');
            card.setAttribute('product-data', JSON.stringify(product));
            productGrid.appendChild(card);
        });
    } catch (error) {
        console.error('Failed to load products:', error);
    }
}

// Initialize products when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeProductListing);

// Messaging System for HarvestLoop
class MessagingSystem {
    constructor() {
        this.currentNegotiation = null;
        this.negotiations = this.loadNegotiations();
        this.messageContainer = document.getElementById('messageContainer');
        this.negotiationsList = document.getElementById('negotiationsList');
        this.chatHeader = document.getElementById('chatHeader');
    }

    // Load negotiations from localStorage
    loadNegotiations() {
        return JSON.parse(localStorage.getItem('negotiations') || '[]');
    }

    // Save negotiations to localStorage
    saveNegotiations() {
        localStorage.setItem('negotiations', JSON.stringify(this.negotiations));
    }

    // Initialize the messaging interface
    init() {
        this.renderNegotiationsList();
        this.setupEventListeners();
    }

    // Render the list of negotiations
    renderNegotiationsList() {
        this.negotiationsList.innerHTML = this.negotiations
            .map(n => `
                <div class="cursor-pointer p-4 hover:bg-gray-50 ${n.status === 'pending' ? 'bg-orange-50' : n.status === 'accepted' ? 'bg-green-50' : ''}"
                     data-negotiation-id="${n.id}">
                    <div class="flex justify-between items-center">
                        <div class="font-medium text-gray-900">${n.consumerName}</div>
                        <span class="text-xs px-2 py-1 rounded-full ${this.getStatusStyle(n.status)}">
                            ${n.status}
                        </span>
                    </div>
                    <div class="text-sm text-gray-500">${n.productName}</div>
                    <div class="text-xs text-gray-400">${new Date(n.timestamp).toLocaleString()}</div>
                </div>
            `)
            .join('');
    }

    // Get status style classes
    getStatusStyle(status) {
        switch(status) {
            case 'pending': return 'bg-orange-100 text-orange-800';
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    // Load and display a specific conversation
    loadConversation(negotiationId) {
        const negotiation = this.negotiations.find(n => n.id === negotiationId);
        if (!negotiation) return;

        this.currentNegotiation = negotiation;
        this.updateChatHeader(negotiation);
        this.renderMessages(negotiation);
    }

    // Update the chat header with negotiation details
    updateChatHeader(negotiation) {
        this.chatHeader.innerHTML = `
            <div class="flex justify-between items-center">
                <div>
                    <h2 class="text-lg font-semibold text-gray-900">${negotiation.consumerName}</h2>
                    <p class="text-sm text-gray-500">${negotiation.productName}</p>
                </div>
                <span class="px-3 py-1 rounded-full ${this.getStatusStyle(negotiation.status)}">
                    ${negotiation.status}
                </span>
            </div>
        `;
    }

    // Render messages for a conversation
    renderMessages(negotiation) {
        this.messageContainer.innerHTML = negotiation.messages
            .map(msg => this.createMessageHTML(msg, negotiation))
            .join('');
        this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
    }

    // Create HTML for a message
    createMessageHTML(msg, negotiation) {
        const isFarmer = msg.sender === 'farmer';
        return `
            <div class="flex ${isFarmer ? 'justify-end' : 'items-start gap-3'}">
                ${!isFarmer ? `
                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium flex-shrink-0">
                        ${msg.consumerInitials || 'C'}
                    </div>
                ` : ''}
                <div class="${isFarmer ? 'bg-green-100 border-green-200' : 'bg-white border-gray-200'} border rounded-xl p-4 max-w-md shadow-sm">
                    ${msg.type === 'offer' ? this.createOfferHTML(msg, negotiation) : msg.message}
                    <div class="text-xs text-gray-400 mt-2">${new Date(msg.timestamp).toLocaleString()}</div>
                </div>
            </div>
        `;
    }

    // Create HTML for an offer message
    createOfferHTML(msg, negotiation) {
        return `
            <h3 class="font-semibold text-gray-800 mb-1">Price Offer</h3>
            <p class="text-sm text-gray-500 mb-3">Offered Price: ₹${msg.price}/kg</p>
            <p class="text-sm text-gray-500 mb-3">Quantity: ${msg.quantity} kg</p>
            ${msg.sender === 'consumer' && negotiation.status === 'pending' ? `
                <div class="flex gap-2 mt-3">
                    <button onclick="messagingSystem.acceptOffer('${negotiation.id}')" 
                            class="bg-green-500 text-white px-3 py-1 rounded-lg text-sm">
                        Accept
                    </button>
                    <button onclick="messagingSystem.counterOffer('${negotiation.id}')" 
                            class="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-sm">
                        Counter
                    </button>
                    <button onclick="messagingSystem.rejectOffer('${negotiation.id}')" 
                            class="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm">
                        Reject
                    </button>
                </div>
            ` : ''}
        `;
    }

    // Accept an offer
    acceptOffer(negotiationId) {
        const negotiation = this.negotiations.find(n => n.id === negotiationId);
        if (!negotiation) return;

        negotiation.status = 'accepted';
        negotiation.messages.push({
            sender: 'farmer',
            message: 'I accept your offer. Please proceed with the purchase.',
            timestamp: new Date().toISOString()
        });

        this.saveNegotiations();
        this.renderNegotiationsList();
        this.loadConversation(negotiationId);
    }

    // Make a counter offer
    counterOffer(negotiationId) {
        const price = prompt('Enter your counter offer price (per kg):');
        if (!price) return;

        const negotiation = this.negotiations.find(n => n.id === negotiationId);
        if (!negotiation) return;

        const lastOffer = negotiation.messages.find(m => m.type === 'offer');
        negotiation.messages.push({
            sender: 'farmer',
            type: 'offer',
            price: parseFloat(price),
            quantity: lastOffer.quantity,
            timestamp: new Date().toISOString()
        });

        this.saveNegotiations();
        this.loadConversation(negotiationId);
    }

    // Reject an offer
    rejectOffer(negotiationId) {
        const negotiation = this.negotiations.find(n => n.id === negotiationId);
        if (!negotiation) return;

        negotiation.status = 'rejected';
        negotiation.messages.push({
            sender: 'farmer',
            message: 'I apologize, but I cannot accept this offer.',
            timestamp: new Date().toISOString()
        });

        this.saveNegotiations();
        this.renderNegotiationsList();
        this.loadConversation(negotiationId);
    }

    // Send a new message
    sendMessage(message) {
        if (!this.currentNegotiation || !message.trim()) return;

        this.currentNegotiation.messages.push({
            sender: 'farmer',
            message: message.trim(),
            timestamp: new Date().toISOString()
        });

        this.saveNegotiations();
        this.loadConversation(this.currentNegotiation.id);
    }

    // Setup event listeners
    setupEventListeners() {
        // Negotiation list click handler
        this.negotiationsList.addEventListener('click', (e) => {
            const negotiationEl = e.target.closest('[data-negotiation-id]');
            if (negotiationEl) {
                const negotiationId = negotiationEl.dataset.negotiationId;
                this.loadConversation(negotiationId);
            }
        });

        // Message input handler
        const messageInput = document.querySelector('input[type="text"]');
        const sendButton = document.querySelector('button');

        if (messageInput && sendButton) {
            const sendMessageHandler = () => {
                this.sendMessage(messageInput.value);
                messageInput.value = '';
            };

            sendButton.addEventListener('click', sendMessageHandler);
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    sendMessageHandler();
                }
            });
        }
    }
}

// Initialize the messaging system
let messagingSystem;
document.addEventListener('DOMContentLoaded', () => {
    messagingSystem = new MessagingSystem();
    messagingSystem.init();
});

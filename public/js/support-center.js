class SupportCenter {
  constructor() {
    this.token = localStorage.getItem('token');
    this.currentUser = null;
    this.currentTicket = null;
    this.isQuickChat = false;
    this.tickets = [];
    
    this.init();
  }

  async init() {
    // Auto-resize textarea
    const messageInput = document.getElementById('messageInput');
    if (messageInput) {
      messageInput.addEventListener('input', this.autoResizeTextarea);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Character counter
      messageInput.addEventListener('input', () => {
        const charCount = document.getElementById('charCount');
        charCount.textContent = `${messageInput.value.length}/1000`;
      });
    }

    // Check if user is logged in
    if (this.token) {
      await this.loadUserInfo();
      await this.loadTickets();
      document.getElementById('loginModal').classList.add('hidden');
    } else {
      document.getElementById('loginModal').classList.remove('hidden');
    }
  }

  async loadUserInfo() {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        this.currentUser = await response.json();
        document.getElementById('userInfo').innerHTML = `
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>${this.currentUser.fullName || this.currentUser.email}</span>
            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">${this.currentUser.role}</span>
          </div>
        `;
      } else {
        this.logout();
      }
    } catch (error) {
      console.error('Error loading user info:', error);
      this.logout();
    }
  }

  async loadTickets() {
    try {
      const response = await fetch('/api/support/tickets', {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        this.tickets = await response.json();
        this.renderTickets();
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
    }
  }

  renderTickets() {
    const ticketsList = document.getElementById('ticketsList');
    
    if (this.tickets.length === 0) {
      ticketsList.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          <i class="fas fa-inbox text-2xl mb-2 text-gray-300"></i>
          <p>No tickets yet</p>
          <p>Create your first support ticket!</p>
        </div>
      `;
      return;
    }

    ticketsList.innerHTML = this.tickets.map(ticket => `
      <div class="ticket-item p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 priority-${ticket.priority}" 
           onclick="supportCenter.openTicket('${ticket._id}')">
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h5 class="font-medium text-sm text-gray-800 truncate">${ticket.subject}</h5>
            <p class="text-xs text-gray-600 mt-1">${ticket.category.replace('_', ' ')}</p>
            <div class="flex items-center gap-2 mt-2">
              <span class="text-xs px-2 py-1 rounded-full status-${ticket.status}">
                ${ticket.status.replace('_', ' ')}
              </span>
              <span class="text-xs text-gray-500">
                ${new Date(ticket.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div class="ml-2 flex flex-col items-end">
            ${ticket.unreadCount > 0 ? `
              <span class="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                ${ticket.unreadCount}
              </span>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  async performLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      this.showAlert('Please enter both email and password', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        this.token = data.token;
        localStorage.setItem('token', this.token);
        
        document.getElementById('loginModal').classList.add('hidden');
        await this.loadUserInfo();
        await this.loadTickets();
        
        this.showAlert('Welcome to HarvestLoop Support!', 'success');
      } else {
        const error = await response.json();
        this.showAlert(error.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showAlert('Connection error. Please try again.', 'error');
    }
  }

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  }

  startQuickChat() {
    this.isQuickChat = true;
    this.currentTicket = null;
    
    document.getElementById('welcomeState').classList.add('hidden');
    document.getElementById('chatInterface').classList.remove('hidden');
    
    document.getElementById('chatTitle').textContent = 'Quick Chat';
    document.getElementById('chatSubtitle').textContent = 'Support Team - Live Help';
    
    this.clearMessages();
    this.addMessage('system', 'Hello! Our support team will be with you shortly. How can we help you today?', 'HarvestLoop Support');
    
    document.getElementById('messageInput').focus();
  }

  async createNewTicket() {
    document.getElementById('newTicketModal').classList.remove('hidden');
  }

  closeNewTicketModal() {
    document.getElementById('newTicketModal').classList.add('hidden');
    document.getElementById('ticketCategory').value = 'general_inquiry';
    document.getElementById('ticketSubject').value = '';
    document.getElementById('ticketMessage').value = '';
  }

  async submitNewTicket() {
    const category = document.getElementById('ticketCategory').value;
    const subject = document.getElementById('ticketSubject').value;
    const message = document.getElementById('ticketMessage').value;

    if (!subject || !message) {
      this.showAlert('Please fill in all required fields', 'error');
      return;
    }

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({ category, subject, message })
      });

      if (response.ok) {
        const ticket = await response.json();
        this.showAlert('Support ticket created successfully!', 'success');
        this.closeNewTicketModal();
        await this.loadTickets();
        this.openTicket(ticket._id);
      } else {
        const error = await response.json();
        this.showAlert(error.message || 'Failed to create ticket', 'error');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      this.showAlert('Connection error. Please try again.', 'error');
    }
  }

  async openTicket(ticketId) {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.ok) {
        this.currentTicket = await response.json();
        this.isQuickChat = false;
        
        document.getElementById('welcomeState').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');
        
        document.getElementById('chatTitle').textContent = `Ticket #${this.currentTicket.ticketNumber}`;
        document.getElementById('chatSubtitle').textContent = this.currentTicket.subject;
        
        this.loadTicketMessages();
        document.getElementById('messageInput').focus();
      }
    } catch (error) {
      console.error('Error opening ticket:', error);
      this.showAlert('Failed to load ticket', 'error');
    }
  }

  loadTicketMessages() {
    this.clearMessages();
    
    this.currentTicket.messages.forEach(message => {
      const senderType = message.sender === this.currentUser._id ? 'user' : 
                        message.senderType === 'ai' ? 'ai' : 'support';
      this.addMessage(senderType, message.content, message.senderName);
    });
  }

  async quickHelp(category) {
    this.startQuickChat();
    
    const helpMessages = {
      payment: "I need help with payment issues",
      technical: "I'm experiencing technical problems",
      account: "I need help with my account",
      orders: "I have questions about my orders"
    };
    
    if (helpMessages[category]) {
      document.getElementById('messageInput').value = helpMessages[category];
      setTimeout(() => this.sendMessage(), 500);
    }
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) return;
    
    messageInput.value = '';
    this.updateCharCount();
    
    // Add user message
    this.addMessage('user', message, this.currentUser.fullName || 'You');
    
    // Show typing indicator
    this.showTyping();
    
    try {
      if (this.isQuickChat) {
        // Quick chat - just show confirmation that message was sent
        setTimeout(() => {
          this.hideTyping();
          this.addMessage('system', 'Your message has been received. A support team member will respond shortly.', 'HarvestLoop Support');
        }, 1000);
      } else if (this.currentTicket) {
        // Add message to existing ticket
        const response = await fetch(`/api/support/tickets/${this.currentTicket._id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({ message })
        });
        
        if (response.ok) {
          const data = await response.json();
          setTimeout(() => {
            this.hideTyping();
            // Message added to ticket successfully
          }, 1000);
          
          await this.loadTickets();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      this.hideTyping();
      this.addMessage('system', 'Sorry, there was an error sending your message. Please try again or contact our support team directly.', 'System');
    }
  }

  addMessage(type, content, senderName) {
    const messagesContainer = document.getElementById('messagesContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-bubble message-${type}`;
    
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
      <div class="flex items-start gap-2">
        <div class="flex-1">
          <div class="text-sm opacity-75 mb-1">${senderName}</div>
          <div>${content}</div>
          <div class="text-xs opacity-50 mt-1">${timestamp}</div>
        </div>
      </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  clearMessages() {
    document.getElementById('messagesContainer').innerHTML = '';
  }

  showTyping() {
    document.getElementById('typingIndicator').classList.remove('hidden');
  }

  hideTyping() {
    document.getElementById('typingIndicator').classList.add('hidden');
  }

  closeChat() {
    document.getElementById('chatInterface').classList.add('hidden');
    document.getElementById('welcomeState').classList.remove('hidden');
    this.currentTicket = null;
    this.isQuickChat = false;
  }

  insertTemplate(text) {
    document.getElementById('messageInput').value = text;
    document.getElementById('messageInput').focus();
    this.updateCharCount();
  }

  autoResizeTextarea() {
    const textarea = document.getElementById('messageInput');
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  updateCharCount() {
    const messageInput = document.getElementById('messageInput');
    const charCount = document.getElementById('charCount');
    charCount.textContent = `${messageInput.value.length}/1000`;
  }

  showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-blue-500 text-white'
    }`;
    
    alert.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas ${
          type === 'success' ? 'fa-check-circle' :
          type === 'error' ? 'fa-exclamation-circle' :
          'fa-info-circle'
        }"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-auto">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(alert);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (alert.parentElement) {
        alert.remove();
      }
    }, 5000);
  }
}

// Global functions for onclick handlers
let supportCenter;

function logout() {
  supportCenter.logout();
}

function performLogin() {
  supportCenter.performLogin();
}

function startQuickChat() {
  supportCenter.startQuickChat();
}

function createNewTicket() {
  supportCenter.createNewTicket();
}

function closeNewTicketModal() {
  supportCenter.closeNewTicketModal();
}

function submitNewTicket() {
  supportCenter.submitNewTicket();
}

function closeChat() {
  supportCenter.closeChat();
}

function sendMessage() {
  supportCenter.sendMessage();
}

function insertTemplate(text) {
  supportCenter.insertTemplate(text);
}

function quickHelp(category) {
  supportCenter.quickHelp(category);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  supportCenter = new SupportCenter();
});

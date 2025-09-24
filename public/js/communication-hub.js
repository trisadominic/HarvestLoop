// Communication Hub JavaScript
class CommunicationHub {
  constructor() {
    this.currentUser = null;
    this.currentConversation = null;
    this.authToken = localStorage.getItem('authToken');
    this.conversations = [];
    this.selectedUser = null;
    this.messagePollingInterval = null;
    
    this.init();
  }

  async init() {
    if (!this.authToken) {
      this.showLoginModal();
      return;
    }

    try {
      await this.verifyAuth();
      await this.loadConversations();
      this.startMessagePolling();
      this.setupEventListeners();
    } catch (error) {
      console.error('Initialization failed:', error);
      this.showLoginModal();
    }
  }

  async verifyAuth() {
    try {
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Auth verification failed');
      }

      this.currentUser = await response.json();
      document.getElementById('userInfo').textContent = 
        `${this.currentUser.username} (${this.currentUser.role})`;
      
      document.getElementById('loginModal').classList.add('hidden');
    } catch (error) {
      localStorage.removeItem('authToken');
      throw error;
    }
  }

  showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
  }

  async performLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
      alert('Please enter both email and password');
      return;
    }

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.authToken = data.token;
        localStorage.setItem('authToken', this.authToken);
        await this.init();
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    }
  }

  async loadConversations() {
    try {
      const response = await fetch('/api/chat/conversations', {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        this.conversations = await response.json();
        this.renderConversations();
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  renderConversations() {
    const container = document.getElementById('conversationsList');
    
    if (this.conversations.length === 0) {
      container.innerHTML = `
        <div class="text-center p-8 text-gray-500">
          <i class="fas fa-comments text-4xl mb-3"></i>
          <p>No conversations yet.</p>
          <p class="text-sm">Start a new chat to begin!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.conversations.map(conv => {
      const otherParticipant = conv.participants.find(p => 
        p.user._id !== this.currentUser._id
      );
      
      const lastMessage = conv.lastMessage;
      const timeAgo = lastMessage ? this.getTimeAgo(new Date(lastMessage.timestamp)) : '';
      
      return `
        <div class="conversation-item p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50" 
             onclick="hub.selectConversation('${conv.conversationId}')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="relative">
                <div class="w-12 h-12 bg-gradient-to-r from-[#7dde83] to-[#608d58] rounded-full flex items-center justify-center text-white font-semibold">
                  ${otherParticipant.name.charAt(0).toUpperCase()}
                </div>
                <div class="online-indicator"></div>
              </div>
              <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${otherParticipant.name}</h4>
                <p class="text-sm text-gray-600">${otherParticipant.role} • ${conv.topic}</p>
                ${lastMessage ? `
                  <p class="text-sm text-gray-500 truncate">
                    ${lastMessage.senderType === 'ai' ? '🤖 ' : ''}${lastMessage.content}
                  </p>
                ` : ''}
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs text-gray-400">${timeAgo}</p>
              ${conv.unreadCount > 0 ? `
                <div class="unread-badge mt-1 ml-auto">${conv.unreadCount}</div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async selectConversation(conversationId) {
    try {
      const response = await fetch(`/api/chat/conversation/${conversationId}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        this.currentConversation = await response.json();
        this.renderActiveChat();
        this.loadMessages();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  }

  renderActiveChat() {
    document.getElementById('noChatSelected').classList.add('hidden');
    document.getElementById('activeChat').classList.remove('hidden');

    const otherParticipant = this.currentConversation.participants.find(p => 
      p.user._id !== this.currentUser._id
    );

    document.getElementById('chatPartnerInitial').textContent = 
      otherParticipant.name.charAt(0).toUpperCase();
    document.getElementById('chatPartnerName').textContent = otherParticipant.name;
    document.getElementById('chatTopic').textContent = 
      `${otherParticipant.role} • ${this.currentConversation.topic}`;
  }

  loadMessages() {
    const container = document.getElementById('messagesContainer');
    
    container.innerHTML = this.currentConversation.messages.map(msg => {
      const isCurrentUser = msg.sender === this.currentUser._id;
      const senderType = msg.senderType;
      
      let messageClass = 'message-bubble ';
      if (senderType === 'ai') {
        messageClass += 'message-ai';
      } else if (senderType === 'farmer') {
        messageClass += 'message-farmer';
      } else {
        messageClass += 'message-consumer';
      }

      const timestamp = new Date(msg.timestamp).toLocaleTimeString([], {
        hour: '2-digit', 
        minute: '2-digit'
      });

      return `
        <div class="flex ${senderType === 'ai' ? 'justify-center' : (isCurrentUser ? 'justify-end' : 'justify-start')}">
          <div class="${messageClass}">
            ${senderType !== 'ai' && !isCurrentUser ? `
              <div class="text-xs opacity-75 mb-1">${this.getOtherParticipantName()}</div>
            ` : ''}
            <div class="message-content">${this.formatMessage(msg.content)}</div>
            <div class="text-xs opacity-75 mt-1">${timestamp}</div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  }

  formatMessage(content) {
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(urlRegex, '<a href="$1" target="_blank" class="underline">$1</a>');
    
    // Convert line breaks to <br>
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }

  getOtherParticipantName() {
    const otherParticipant = this.currentConversation.participants.find(p => 
      p.user._id !== this.currentUser._id
    );
    return otherParticipant.name;
  }

  async sendMessage() {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content || !this.currentConversation) {
      return;
    }

    try {
      // Show typing indicator
      this.showTypingIndicator();

      const response = await fetch(`/api/chat/conversation/${this.currentConversation.conversationId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          content,
          messageType: 'text'
        })
      });

      if (response.ok) {
        input.value = '';
        this.updateCharCount();
        await this.selectConversation(this.currentConversation.conversationId);
        await this.loadConversations(); // Refresh conversations list
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      this.hideTypingIndicator();
    }
  }

  showTypingIndicator() {
    document.getElementById('typingIndicator').classList.remove('hidden');
  }

  hideTypingIndicator() {
    document.getElementById('typingIndicator').classList.add('hidden');
  }

  async searchUsers() {
    const query = document.getElementById('searchUsers').value.trim();
    if (!query) return;

    try {
      const response = await fetch(`/api/chat/find-users?search=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const users = await response.json();
        this.displaySearchResults(users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }

  displaySearchResults(users) {
    const container = document.getElementById('searchResultsList');
    const resultsDiv = document.getElementById('searchResults');
    
    if (users.length === 0) {
      container.innerHTML = '<p class="text-gray-500">No users found</p>';
    } else {
      container.innerHTML = users.map(user => `
        <div class="flex items-center justify-between p-2 bg-white rounded-lg mb-2 border">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gradient-to-r from-[#7dde83] to-[#608d58] rounded-full flex items-center justify-center text-white text-sm font-semibold">
              ${user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p class="font-medium text-sm">${user.username}</p>
              <p class="text-xs text-gray-500">${user.role}</p>
            </div>
          </div>
          <button onclick="hub.startChatWith('${user._id}', '${user.email}', '${user.username}')" 
                  class="px-3 py-1 bg-[#7dde83] text-white text-xs rounded hover:bg-[#608d58]">
            Chat
          </button>
        </div>
      `).join('');
    }
    
    resultsDiv.classList.remove('hidden');
  }

  async startChatWith(userId, email, username) {
    try {
      const topic = prompt(`Enter a topic for your chat with ${username}:`) || 'General Inquiry';
      
      const response = await fetch('/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          participantEmail: email,
          topic: topic
        })
      });

      if (response.ok) {
        const data = await response.json();
        await this.loadConversations();
        await this.selectConversation(data.conversationId);
        
        // Clear search
        document.getElementById('searchUsers').value = '';
        document.getElementById('searchResults').classList.add('hidden');
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  }

  showNewChatModal() {
    document.getElementById('newChatModal').classList.remove('hidden');
  }

  closeNewChatModal() {
    document.getElementById('newChatModal').classList.add('hidden');
    document.getElementById('newChatSearch').value = '';
    document.getElementById('newChatResults').innerHTML = '';
  }

  insertQuickMessage(message) {
    const input = document.getElementById('messageInput');
    input.value = message;
    input.focus();
    this.updateCharCount();
  }

  updateCharCount() {
    const input = document.getElementById('messageInput');
    const count = input.value.length;
    document.getElementById('charCount').textContent = `${count}/1000`;
  }

  startMessagePolling() {
    // Poll for new messages every 3 seconds
    this.messagePollingInterval = setInterval(async () => {
      if (this.currentConversation) {
        const oldMessageCount = this.currentConversation.messages.length;
        await this.selectConversation(this.currentConversation.conversationId);
        
        // If new messages, scroll to bottom
        if (this.currentConversation.messages.length > oldMessageCount) {
          const container = document.getElementById('messagesContainer');
          container.scrollTop = container.scrollHeight;
        }
      }
      
      // Always refresh conversations list for unread counts
      await this.loadConversations();
    }, 3000);
  }

  setupEventListeners() {
    // Message input enter key
    document.getElementById('messageInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Character count
    document.getElementById('messageInput').addEventListener('input', () => {
      this.updateCharCount();
    });

    // Search on enter
    document.getElementById('searchUsers').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchUsers();
      }
    });

    // Login on enter
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.performLogin();
      }
    });
  }

  getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  logout() {
    localStorage.removeItem('authToken');
    if (this.messagePollingInterval) {
      clearInterval(this.messagePollingInterval);
    }
    window.location.reload();
  }
}

// Global functions for onclick handlers
window.hub = new CommunicationHub();

window.performLogin = () => hub.performLogin();
window.logout = () => hub.logout();
window.searchUsers = () => hub.searchUsers();
window.showNewChatModal = () => hub.showNewChatModal();
window.closeNewChatModal = () => hub.closeNewChatModal();
window.sendMessage = () => hub.sendMessage();
window.insertQuickMessage = (msg) => hub.insertQuickMessage(msg);
window.viewChatInfo = () => alert('Chat info feature coming soon!');
window.archiveChat = () => {
  if (confirm('Archive this conversation?')) {
    // Implementation for archiving
    alert('Archive feature coming soon!');
  }
};

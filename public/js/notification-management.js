// Notification Management JavaScript

class NotificationManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.notifications = [];
        this.unreadCount = 0;
    }

    // Initialize notification system
    init() {
        this.setupUI();
        this.startPolling();
    }

    // Setup notification UI elements
    setupUI() {
        this.createNotificationPanel();
        this.setupEventListeners();
    }

    // Create notification panel in DOM
    createNotificationPanel() {
        const panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.className = 'fixed right-4 top-20 w-96 bg-white rounded-lg shadow-xl hidden transform transition-transform duration-200 z-50';
        panel.innerHTML = `
            <div class="p-4 border-b">
                <div class="flex justify-between items-center">
                    <h3 class="font-semibold">Notifications</h3>
                    <button id="close-notifications" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div id="notifications-list" class="max-h-[400px] overflow-y-auto">
                <!-- Notifications will be inserted here -->
            </div>
        `;
        document.body.appendChild(panel);
    }

    // Setup event listeners
    setupEventListeners() {
        // Toggle notification panel
        document.getElementById('notifications-btn')?.addEventListener('click', () => {
            this.toggleNotificationPanel();
        });

        // Close notification panel
        document.getElementById('close-notifications')?.addEventListener('click', () => {
            this.hideNotificationPanel();
        });

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notification-panel');
            const btn = document.getElementById('notifications-btn');
            if (panel && !panel.contains(e.target) && !btn?.contains(e.target)) {
                this.hideNotificationPanel();
            }
        });
    }

    // Start polling for notifications
    startPolling() {
        this.checkNotifications();
        setInterval(() => this.checkNotifications(), 30000); // Check every 30 seconds
    }

    // Check for new notifications
    async checkNotifications() {
        try {
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch notifications');

            this.notifications = await response.json();
            this.updateNotificationBadge();
            this.updateNotificationList();
        } catch (error) {
            console.error('Notification check failed:', error);
        }
    }

    // Update notification badge
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notification-badge');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        this.unreadCount = unreadCount;
    }

    // Update notification list in panel
    updateNotificationList() {
        const list = document.getElementById('notifications-list');
        if (!list) return;

        list.innerHTML = this.notifications.map(notification => `
            <div class="p-4 border-b ${notification.read ? 'bg-gray-50' : 'bg-white'}" 
                data-notification-id="${notification._id}">
                <div class="flex justify-between items-start">
                    <div class="flex-grow">
                        <p class="${notification.read ? 'text-gray-600' : 'text-black'}">
                            ${notification.message}
                        </p>
                        <small class="text-gray-500">
                            ${this.formatDate(notification.createdAt)}
                        </small>
                    </div>
                    ${!notification.read ? `
                        <button class="mark-read-btn text-blue-500 text-sm hover:text-blue-700">
                            Mark as Read
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add event listeners to "Mark as Read" buttons
        list.querySelectorAll('.mark-read-btn').forEach(btn => {
            const notificationId = btn.closest('[data-notification-id]').dataset.notificationId;
            btn.addEventListener('click', () => this.markAsRead(notificationId));
        });
    }

    // Toggle notification panel visibility
    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel.classList.contains('hidden')) {
            this.showNotificationPanel();
        } else {
            this.hideNotificationPanel();
        }
    }

    // Show notification panel
    showNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel.classList.remove('hidden');
        this.updateNotificationList();
    }

    // Hide notification panel
    hideNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel.classList.add('hidden');
    }

    // Mark a notification as read
    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to mark notification as read');

            // Update local state
            const notification = this.notifications.find(n => n._id === notificationId);
            if (notification) {
                notification.read = true;
                this.updateNotificationBadge();
                this.updateNotificationList();
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Less than 24 hours ago
        if (diff < 24 * 60 * 60 * 1000) {
            if (diff < 60 * 60 * 1000) {
                // Less than 1 hour ago
                const minutes = Math.floor(diff / (60 * 1000));
                return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
            } else {
                // More than 1 hour ago
                const hours = Math.floor(diff / (60 * 60 * 1000));
                return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            }
        }

        // More than 24 hours ago
        return date.toLocaleDateString(undefined, { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Show a toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' :
            'bg-blue-500'
        } text-white`;
        
        toast.innerHTML = message;
        document.body.appendChild(toast);

        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize notification management when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const notificationManager = new NotificationManager();
    notificationManager.init();
});

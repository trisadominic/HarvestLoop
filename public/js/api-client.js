/**
 * Robust API utility with retry logic and timeout handling
 * Prevents "site can't be reached" errors by implementing proper error handling
 */
class APIClient {
  constructor() {
    this.baseURL = '';
    this.defaultTimeout = 15000; // 15 seconds
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Make API request with retry logic and proper error handling
   */
  async request(url, options = {}) {
    const config = {
      timeout: this.defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add authentication token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`🔄 API Request attempt ${attempt}/${this.maxRetries} to ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if response is ok
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`✅ API Request successful on attempt ${attempt}`);
        return { success: true, data, status: response.status };

      } catch (error) {
        console.error(`❌ API Request failed on attempt ${attempt}:`, error.message);
        
        // Don't retry on auth errors or client errors (4xx)
        if (error.name === 'AbortError') {
          console.error('⏰ Request timed out');
        } else if (error.message.includes('401') || error.message.includes('403')) {
          console.error('🔐 Authentication error - redirecting to login');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          
          // Use navigation manager for better back button support
          if (window.NavigationManager) {
            NavigationManager.redirectToLogin('Your session has expired. Please login again.');
          } else {
            window.location.href = '/login.html';
          }
          return { success: false, error: 'Authentication failed' };
        }

        // If this is the last attempt, throw the error
        if (attempt === this.maxRetries) {
          throw new Error(`Failed after ${this.maxRetries} attempts: ${error.message}`);
        }

        // Wait before retrying
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  /**
   * Utility function to create delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * POST request with retry logic
   */
  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * GET request with retry logic
   */
  async get(url) {
    return this.request(url, {
      method: 'GET'
    });
  }

  /**
   * PUT request with retry logic
   */
  async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
}

// Create global instance
window.apiClient = new APIClient();

/**
 * Show user-friendly error messages
 */
function showErrorMessage(message, type = 'error') {
  // Remove existing error messages
  const existingError = document.getElementById('error-message');
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-message';
  errorDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'warning' ? 'bg-yellow-500 text-white' :
    'bg-red-500 text-white'
  }`;
  
  errorDiv.innerHTML = `
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <i class="fas ${
          type === 'success' ? 'fa-check-circle' :
          type === 'warning' ? 'fa-exclamation-triangle' :
          'fa-exclamation-circle'
        } mr-2"></i>
        <span>${message}</span>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;

  document.body.appendChild(errorDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (errorDiv.parentElement) {
      errorDiv.remove();
    }
  }, 5000);
}

/**
 * Show loading spinner during API calls
 */
function showLoadingSpinner(message = 'Processing...') {
  const existingSpinner = document.getElementById('loading-spinner');
  if (existingSpinner) {
    existingSpinner.remove();
  }

  const spinnerDiv = document.createElement('div');
  spinnerDiv.id = 'loading-spinner';
  spinnerDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  
  spinnerDiv.innerHTML = `
    <div class="bg-white rounded-lg p-6 flex items-center">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-4"></div>
      <span class="text-gray-700">${message}</span>
    </div>
  `;

  document.body.appendChild(spinnerDiv);
}

function hideLoadingSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.remove();
  }
}
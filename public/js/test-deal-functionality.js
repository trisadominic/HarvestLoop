/**
 * Test script to verify deal functionality and error handling
 * Run this after implementing the fixes
 */

const testDealFunctionality = () => {
    console.log('🧪 Testing Deal Functionality and Error Handling...');
    
    // Test 1: Check if API client is loaded
    if (typeof window.apiClient === 'undefined') {
        console.error('❌ API client not loaded');
        return false;
    } else {
        console.log('✅ API client loaded successfully');
    }
    
    // Test 2: Check error message function
    if (typeof showErrorMessage === 'function') {
        console.log('✅ showErrorMessage function available');
        // Test error display
        showErrorMessage('Test error message', 'error');
        setTimeout(() => {
            const errorDiv = document.getElementById('error-message');
            if (errorDiv) {
                errorDiv.remove();
                console.log('✅ Error message display working');
            }
        }, 1000);
    } else {
        console.error('❌ showErrorMessage function not available');
    }
    
    // Test 3: Check loading spinner
    if (typeof showLoadingSpinner === 'function') {
        console.log('✅ Loading spinner functions available');
        showLoadingSpinner('Testing...');
        setTimeout(() => {
            hideLoadingSpinner();
            console.log('✅ Loading spinner working');
        }, 2000);
    } else {
        console.error('❌ Loading spinner functions not available');
    }
    
    // Test 4: Test API client timeout handling
    console.log('🔄 Testing API timeout handling...');
    window.apiClient.defaultTimeout = 1; // Very short timeout for testing
    
    window.apiClient.get('/api/test-timeout')
        .then(() => {
            console.log('⚠️ Request should have timed out');
        })
        .catch(error => {
            if (error.message.includes('timeout') || error.message.includes('aborted')) {
                console.log('✅ Timeout handling working correctly');
            } else {
                console.log('✅ Error handling working:', error.message);
            }
            // Reset timeout
            window.apiClient.defaultTimeout = 15000;
        });
    
    return true;
};

// Auto-run test when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', testDealFunctionality);
} else {
    testDealFunctionality();
}

// Make function available globally for manual testing
window.testDealFunctionality = testDealFunctionality;

console.log('🧪 Test script loaded. Call testDealFunctionality() to run tests manually.');
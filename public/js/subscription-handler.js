// Subscription handler
async function subscribeToPlan(planName) {
    try {
        // Ensure user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Show confirmation dialog with plan details
        const planDetails = {
            basic: { price: '₹199', duration: '1 month', points: 10 },
            premium: { price: '₹399', duration: '3 months', points: 25 },
            unlimited: { price: '₹999', duration: '12 months', points: 100 }
        };

        const plan = planDetails[planName.toLowerCase()];
        if (!confirm(`Confirm subscription to ${planName} plan:\n\nPrice: ${plan.price}\nDuration: ${plan.duration}\nPoints: ${plan.points}`)) {
            return;
        }

        // Create subscription
        const response = await fetch('/api/subscriptions/purchase', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                plan: planName
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to create subscription');
        }

        // Show success message
        alert('Subscription activated successfully!');
        
        // Redirect to dashboard
        window.location.href = '/consumer-dashboard.html';
    } catch (error) {
        console.error('Subscription error:', error);
        alert(error.message || 'Failed to process subscription');
    }
}

// Initialize subscription page
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Check user role
    const user = JSON.parse(localStorage.getItem('user'));
    if (user.role !== 'Consumer') {
        window.location.href = '/';
        return;
    }

    // Add event listeners to subscription buttons
    ['Basic', 'Premium', 'VIP'].forEach(plan => {
        document.querySelector(`#choose-${plan.toLowerCase()}-btn`)?.addEventListener('click', () => {
            subscribeToPlan(plan);
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    // Check for pending signup data from session storage
    const pendingSignup = sessionStorage.getItem('pendingSignup');
    if (!pendingSignup) {
        alert('❌ Please complete signup first');
        window.location.href = '/signup.html';
        return;
    }
    
    // Parse the pending signup data
    const signupData = JSON.parse(pendingSignup);
    if (!signupData || !signupData.tempData) {
        alert('❌ Invalid signup data');
        sessionStorage.removeItem('pendingSignup');
        window.location.href = '/signup.html';
        return;
    }

    console.log('Subscription page loaded, pendingSignup:', pendingSignup);

    // Get all subscribe buttons
    const subscribeButtons = document.querySelectorAll('button[data-plan]');
    
    subscribeButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const plan = e.target.dataset.plan;
            const duration = e.target.dataset.duration;
            const amount = e.target.dataset.amount;
            
            // Prepare Razorpay options
            const options = {
                key: 'rzp_test_9WFPdEHGJZVj9r', // Replace with your Razorpay key
                amount: parseFloat(amount) * 100, // Amount in paise
                currency: 'INR',
                name: 'HarvestLoop',
                description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${duration} month(s)`,
                prefill: {
                    name: signupData.tempData.username,
                    email: signupData.tempData.email,
                    contact: signupData.tempData.phone
                },
                theme: {
                    color: '#4ded80'
                },
                handler: async function(response) {
                    try {
                        // Verify payment first
                        const verifyResponse = await fetch('/api/verify-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (!verifyResponse.ok) {
                            throw new Error('Payment verification failed');
                        }

                        // Prepare signup data with subscription
                        const signupDataCopy = JSON.parse(sessionStorage.getItem('pendingSignup'));
                        signupDataCopy.subscription = {
                            txid: response.razorpay_payment_id,
                            amount: parseFloat(amount),
                            planName: plan.toLowerCase(), // Convert to lowercase for enum
                            duration: parseInt(duration),
                            farmerAccess: parseInt(duration) * 10
                        };

                        console.log('Creating user account with subscription data:', signupDataCopy);

                        // Create the user account with subscription
                        const signupResponse = await fetch('/signup', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(signupDataCopy)
                        });

                        const signupResult = await signupResponse.json();

                        if (!signupResponse.ok) {
                            throw new Error(signupResult.message || 'Registration failed');
                        }

                        console.log('Registration successful:', signupResult);
                        
                        // Clear the pending signup data
                        sessionStorage.removeItem('pendingSignup');
                        
                        // Redirect to receipt page with payment details
                        const receiptParams = new URLSearchParams({
                            txid: response.razorpay_payment_id,
                            plan: plan,
                            amount: amount,
                            duration: duration,
                            farmers: plan === 'premium' ? '30' : (plan === 'basic' ? '10' : '100')
                        });
                        
                        window.location.href = `/receipt.html?${receiptParams.toString()}`;
                        
                    } catch (error) {
                        console.error('Error during registration:', error);
                        alert(`❌ Registration failed: ${error.message}`);
                        // Don't redirect on error, let user try again
                    }
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment cancelled by user');
                    }
                }
            };

            // Open Razorpay payment modal
            const rzp = new Razorpay(options);
            rzp.open();
        });
    });

    // Add event handlers for subscription plan selection
    const planCards = document.querySelectorAll('.hover-card');
    planCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selection from other cards
            planCards.forEach(c => c.classList.remove('ring-2', 'ring-green-500'));
            // Add selection to clicked card
            this.classList.add('ring-2', 'ring-green-500');
            // Enable the subscribe button for this plan
            const button = this.querySelector('button[data-plan]');
            if (button) {
                button.disabled = false;
                button.classList.remove('opacity-50');
            }
        });
    });
});

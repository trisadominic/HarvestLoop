// Function to request OTP
function requestOtp(method) {
  const email = document.getElementById('email').value;
  const phone = document.getElementById('phone')?.value || '';
  
  if (!email && method === 'email') {
    alert('Please enter your email address');
    return;
  }
  
  if (!phone && method === 'sms') {
    alert('Please enter your phone number');
    return;
  }
  
  // Show loading indicator
  document.getElementById('otp-loading').style.display = 'block';
  
  // Make API call to request OTP
  fetch('/api/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, phone, method })
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('otp-loading').style.display = 'none';
    
    if (data.success) {
      // Show OTP input field
      document.getElementById('otp-section').style.display = 'block';
      
      // In debug mode, show the OTP (remove in production)
      if (data.debugMode && data.testOtp) {
        document.getElementById('test-otp').textContent = `Test OTP: ${data.testOtp}`;
        document.getElementById('test-otp').style.display = 'block';
      }
      
      alert(`OTP sent successfully to your ${method === 'email' ? 'email' : 'phone'}`);
    } else {
      alert(data.message || 'Failed to send OTP');
    }
  })
  .catch(error => {
    document.getElementById('otp-loading').style.display = 'none';
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  });
}
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

// Add/update this function in your login.js
function requestOTP() {
  const email = document.getElementById('email').value;
  
  if (!email) {
    alert('Please enter your email address');
    return;
  }
  
  // Show loading indicator
  document.getElementById('test-otp-display').textContent = 'Generating OTP...';
  
  // Request OTP
  fetch('/api/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Display test OTP
      if (data.testMode && data.otp) {
        document.getElementById('test-otp-display').textContent = `Your OTP: ${data.otp}`;
      } else {
        document.getElementById('test-otp-display').textContent = 'OTP sent to your email';
      }
      
      // Show OTP input form
      document.getElementById('otp-form').style.display = 'block';
      document.getElementById('login-form').style.display = 'none';
    } else {
      alert(data.message || 'Failed to send OTP');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById('test-otp-display').textContent = 'Error generating OTP';
    alert('An error occurred while requesting OTP');
  });
}
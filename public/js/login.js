// Add this where you handle OTP sending response

// Example code - modify based on your frontend structure
function requestOtp() {
  const phone = document.getElementById('phone').value;
  
  fetch('/api/send-otp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ phone })
  })
  .then(response => response.json())
  .then(data => {
    if (data.testOtp) {
      // Show test OTP for development
      document.getElementById('test-otp-display').textContent = 
        `Test OTP: ${data.testOtp} (only visible in development)`;
    }
    // Show OTP input field
    document.getElementById('otp-section').style.display = 'block';
  })
  .catch(error => {
    console.error('Error requesting OTP:', error);
    alert('Failed to send OTP. Please try again.');
  });
}
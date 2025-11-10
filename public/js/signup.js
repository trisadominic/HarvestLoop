// Validation helper functions
function showError(fieldId, errorId, message) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(errorId);
    if (field && errorDiv) {
        field.classList.remove('border-gray-300', 'focus:ring-[#7dde83]');
        field.classList.add('border-red-500', 'focus:ring-red-500');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideError(fieldId, errorId) {
    const field = document.getElementById(fieldId);
    const errorDiv = document.getElementById(errorId);
    if (field && errorDiv) {
        field.classList.remove('border-red-500', 'focus:ring-red-500');
        field.classList.add('border-gray-300', 'focus:ring-[#7dde83]');
        errorDiv.classList.add('hidden');
    }
}

function validatePassword(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    return Object.values(requirements).every(req => req);
}

// Enhanced validation function
function validateForm(data) {
    let isValid = true;

    // Full Name: only alphabets + space
    const nameRegex = /^[A-Za-z\s]+$/;
    const trimmedName = data.username ? data.username.trim() : '';
    if (!trimmedName || !nameRegex.test(trimmedName)) {
        showError('name', 'name-error', 'Full name should contain only letters and spaces');
        isValid = false;
    } else {
        hideError('name', 'name-error');
    }

    // Phone Number: must be exactly 10 digits and not start with 0
    const phoneRegex = /^[1-9][0-9]{9}$/;
    if (!data.phone || !phoneRegex.test(data.phone)) {
        showError('phone', 'phone-error', 'Mobile number must be exactly 10 digits and cannot start with 0');
        isValid = false;
    } else {
        hideError('phone', 'phone-error');
    }

    // Email validation - allow any valid email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!data.email || !emailRegex.test(data.email)) {
        showError('email', 'email-error', 'Please enter a valid email address');
        isValid = false;
    } else {
        hideError('email', 'email-error');
    }

    // Password validation
    if (!data.password || !validatePassword(data.password)) {
        showError('password', 'password-error', 'Password must meet all requirements');
        isValid = false;
    } else {
        hideError('password', 'password-error');
    }

    // Password confirmation
    const confirmPassword = document.getElementById("confirm-password");
    if (!confirmPassword || data.password !== confirmPassword.value) {
        showError('confirm-password', 'confirm-password-error', 'Passwords do not match');
        isValid = false;
    } else {
        hideError('confirm-password', 'confirm-password-error');
    }

    // PIN Code: must be 6 digits (if consumer and provided)
    if (data.role === "Consumer" && data.pincode) {
        const pinRegex = /^[0-9]{6}$/;
        if (!pinRegex.test(data.pincode)) {
            showError('pincode', 'pincode-error', 'PIN code must be exactly 6 digits');
            isValid = false;
        } else {
            hideError('pincode', 'pincode-error');
        }
    }

    return isValid;
}

function toggleRoleFields() {
    const consumerRadio = document.querySelector('input[value="Consumer"]');
    const farmerRadio = document.querySelector('input[value="Farmer"]');
    const farmerFields = document.getElementById('farmer-fields');
    const consumerFields = document.getElementById('consumer-fields');

    if (consumerRadio && consumerRadio.checked) {
        if (consumerFields) consumerFields.classList.remove('hidden');
        if (farmerFields) farmerFields.classList.add('hidden');
    } else {
        if (consumerFields) consumerFields.classList.add('hidden');
        if (farmerFields) farmerFields.classList.remove('hidden');
    }
}

function setupRealTimeValidation() {
    // Name validation
    const nameField = document.getElementById('name');
    if (nameField) {
        nameField.addEventListener('input', function() {
            const nameRegex = /^[A-Za-z\s]+$/;
            const trimmedValue = this.value.trim();
            
            if (trimmedValue === '') {
                hideError('name', 'name-error');
            } else if (!nameRegex.test(trimmedValue)) {
                showError('name', 'name-error', 'Full name should contain only letters and spaces');
            } else {
                hideError('name', 'name-error');
            }
        });
    }

    // Phone validation
    const phoneField = document.getElementById('phone');
    if (phoneField) {
        phoneField.addEventListener('input', function() {
            // Remove any non-digit characters
            let value = this.value.replace(/\D/g, '');
            
            // Prevent starting with 0
            if (value.startsWith('0')) {
                value = value.substring(1);
            }
            
            // Limit to 10 digits
            if (value.length > 10) {
                value = value.substring(0, 10);
            }
            
            // Update the input value
            this.value = value;
            
            // Validate the number
            const phoneRegex = /^[1-9][0-9]{9}$/;
            if (value.length === 0) {
                hideError('phone', 'phone-error');
            } else if (value.length < 10) {
                showError('phone', 'phone-error', 'Mobile number must be exactly 10 digits');
            } else if (!phoneRegex.test(value)) {
                showError('phone', 'phone-error', 'Mobile number cannot start with 0');
            } else {
                hideError('phone', 'phone-error');
            }
        });

        // Prevent non-digit characters and starting with 0 on keypress
        phoneField.addEventListener('keypress', function(e) {
            const char = String.fromCharCode(e.which);
            
            // Allow only digits
            if (!/[0-9]/.test(char)) {
                e.preventDefault();
                return false;
            }
            
            // Prevent starting with 0
            if (this.value.length === 0 && char === '0') {
                e.preventDefault();
                return false;
            }
            
            // Prevent more than 10 digits
            if (this.value.length >= 10) {
                e.preventDefault();
                return false;
            }
        });

        // Handle paste events
        phoneField.addEventListener('paste', function(e) {
            e.preventDefault();
            let paste = (e.clipboardData || window.clipboardData).getData('text');
            
            // Remove non-digits
            paste = paste.replace(/\D/g, '');
            
            // Remove leading zeros
            paste = paste.replace(/^0+/, '');
            
            // Limit to 10 digits
            if (paste.length > 10) {
                paste = paste.substring(0, 10);
            }
            
            this.value = paste;
            
            // Trigger validation
            const event = new Event('input', { bubbles: true });
            this.dispatchEvent(event);
        });
    }

    // Email validation - more flexible to allow domains like .co, .com, .org, etc.
    const emailField = document.getElementById('email');
    if (emailField) {
        emailField.addEventListener('input', function() {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (this.value.trim() === '') {
                hideError('email', 'email-error');
            } else if (!emailRegex.test(this.value)) {
                showError('email', 'email-error', 'Please enter a valid email address');
            } else {
                hideError('email', 'email-error');
            }
        });
    }

    // Password validation
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            const strengthDiv = document.getElementById('password-strength');
            if (this.value.trim() === '') {
                hideError('password', 'password-error');
                if (strengthDiv) strengthDiv.classList.add('hidden');
            } else {
                if (strengthDiv) strengthDiv.classList.remove('hidden');
                const isValid = validatePasswordWithUI(this.value);
                if (!isValid) {
                    showError('password', 'password-error', 'Password requirements not met');
                } else {
                    hideError('password', 'password-error');
                }
            }
            
            // Also validate confirm password if it has a value
            const confirmPassword = document.getElementById('confirm-password');
            if (confirmPassword && confirmPassword.value.trim() !== '') {
                if (this.value !== confirmPassword.value) {
                    showError('confirm-password', 'confirm-password-error', 'Passwords do not match');
                } else {
                    hideError('confirm-password', 'confirm-password-error');
                }
            }
        });
    }

    // Confirm password validation
    const confirmPasswordField = document.getElementById('confirm-password');
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('input', function() {
            const password = document.getElementById('password').value;
            if (this.value.trim() === '') {
                hideError('confirm-password', 'confirm-password-error');
            } else if (this.value !== password) {
                showError('confirm-password', 'confirm-password-error', 'Passwords do not match');
            } else {
                hideError('confirm-password', 'confirm-password-error');
            }
        });
    }

    // PIN code validation with 6-digit limit
    const pincodeField = document.getElementById('pincode');
    if (pincodeField) {
        pincodeField.addEventListener('input', function() {
            // Remove any non-digit characters
            let value = this.value.replace(/\D/g, '');
            
            // Limit to 6 digits
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            
            // Update the input value
            this.value = value;
            
            // Validate the PIN code
            const pincodeRegex = /^[0-9]{6}$/;
            if (value.length === 0) {
                hideError('pincode', 'pincode-error');
            } else if (value.length < 6) {
                showError('pincode', 'pincode-error', 'PIN code must be exactly 6 digits');
            } else if (!pincodeRegex.test(value)) {
                showError('pincode', 'pincode-error', 'PIN code must be exactly 6 digits');
            } else {
                hideError('pincode', 'pincode-error');
            }
        });

        // Prevent non-digit characters on keypress for PIN code
        pincodeField.addEventListener('keypress', function(e) {
            const char = String.fromCharCode(e.which);
            
            // Allow only digits
            if (!/[0-9]/.test(char)) {
                e.preventDefault();
                return false;
            }
            
            // Prevent more than 6 digits
            if (this.value.length >= 6) {
                e.preventDefault();
                return false;
            }
        });

        // Handle paste events for PIN code
        pincodeField.addEventListener('paste', function(e) {
            e.preventDefault();
            let paste = (e.clipboardData || window.clipboardData).getData('text');
            
            // Remove non-digits
            paste = paste.replace(/\D/g, '');
            
            // Limit to 6 digits
            if (paste.length > 6) {
                paste = paste.substring(0, 6);
            }
            
            this.value = paste;
            
            // Trigger validation
            const event = new Event('input', { bubbles: true });
            this.dispatchEvent(event);
        });
    }
}

function validatePasswordWithUI(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    // Update visual indicators if they exist
    const lengthCheck = document.getElementById('length-check');
    const uppercaseCheck = document.getElementById('uppercase-check');
    const lowercaseCheck = document.getElementById('lowercase-check');
    const numberCheck = document.getElementById('number-check');
    const specialCheck = document.getElementById('special-check');

    if (lengthCheck) lengthCheck.className = requirements.length ? 'text-green-500' : 'text-red-500';
    if (uppercaseCheck) uppercaseCheck.className = requirements.uppercase ? 'text-green-500' : 'text-red-500';
    if (lowercaseCheck) lowercaseCheck.className = requirements.lowercase ? 'text-green-500' : 'text-red-500';
    if (numberCheck) numberCheck.className = requirements.number ? 'text-green-500' : 'text-red-500';
    if (specialCheck) specialCheck.className = requirements.special ? 'text-green-500' : 'text-red-500';

    return Object.values(requirements).every(req => req);
}

document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const roleRadios = document.querySelectorAll('input[name="role"]');
    
    // Set up role toggle listeners
    roleRadios.forEach(radio => {
        radio.addEventListener('change', toggleRoleFields);
    });
    toggleRoleFields(); // Initial call

    // Real-time validation setup
    setupRealTimeValidation();

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const role = document.querySelector('input[name="role"]:checked').value;
            const username = document.getElementById('name').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const farmName = document.getElementById('farm-name')?.value || '';
            const farmAddress = document.getElementById('farm-address')?.value || '';
            const deliveryAddress = document.getElementById('delivery-address')?.value || '';
            const pincode = document.getElementById('pincode')?.value || '';

            const farmProducts = Array.from(document.querySelectorAll('#farmer-fields input[type="checkbox"]:checked')).map(cb => cb.nextElementSibling.innerText.trim());
            const interests = Array.from(document.querySelectorAll('.interest-checkbox:checked')).map(cb => cb.nextElementSibling.innerText.trim());

            const formData = {
                username,
                phone,
                email,
                password,
                role,
                'farm-name': farmName,
                'farm-address': farmAddress,
                farmProducts,
                deliveryAddress,
                pincode,
                interests,
                subscription: null
            };

            // Validate form data
            if (!validateForm(formData)) {
                return;
            }

            try {
                // Check if email exists
                const checkResponse = await fetch('/api/check-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email })
                });
                const checkResult = await checkResponse.json();
                if (checkResult.exists) {
                    showError('email', 'email-error', `This email is already registered as a ${checkResult.role || 'user'}. Please use a different email or login.`);
                    return;
                }

                if (formData.role === 'Farmer') {
                    // Submit signup data for Farmer
                    const response = await fetch('/signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    const msg = await response.text();
                    if (response.ok) {
                        alert('✅ Farmer registration successful!');
                        window.location.href = '/login.html';
                    } else {
                        alert('❌ ' + msg);
                    }
                } else {
                    // For Consumer, store data and redirect to subscription page
                    sessionStorage.setItem('pendingSignup', JSON.stringify(formData));
                    window.location.href = '/subscription.html';
                }
            } catch (err) {
                console.error('Signup error:', err);
                alert('⚠️ Failed to register user.');
            }
        });
    }
});



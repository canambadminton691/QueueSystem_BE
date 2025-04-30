// Phone number validation function
const validatePhoneNumber = (phone) => {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
  
    if (cleanPhone.length === 0) {
      return {
        isValid: false,
        error: 'Please enter a phone number'
      };
    }
  
    if (cleanPhone.length !== 10) {
      return {
        isValid: false,
        error: 'Phone number must be exactly 10 digits'
      };
    }
  
    if (/^[01]/.test(cleanPhone)) {
      return {
        isValid: false,
        error: 'Phone number cannot start with 0 or 1'
      };
    }
  
    return {
      isValid: true,
      cleaned: cleanPhone,
      formatted: `(${cleanPhone.slice(0,3)}) ${cleanPhone.slice(3,6)}-${cleanPhone.slice(6)}`
    };
  };
  
  module.exports = {
    validatePhoneNumber
  };
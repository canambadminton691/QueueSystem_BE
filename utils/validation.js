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

  const lastFive = cleanPhone.slice(-5);

  if (lastFive.length !== 5) {
    return {
      isValid: false,
      error: 'Last 5 digits of phone number are required'
    };
  }

  return {
    isValid: true,
    cleaned: lastFive,
    formatted: lastFive
  };
};

module.exports = {
  validatePhoneNumber
};

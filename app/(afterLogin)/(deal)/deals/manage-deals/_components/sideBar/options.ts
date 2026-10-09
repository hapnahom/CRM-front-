export const dealValidation = {
  patterns: {
    phone: /^[\+]?[1-9][\d]{0,15}$/,
    amount: /^[0-9]+(\.[0-9]{1,2})?$/,
  },

  messages: {
    phone: 'Phone number must be a valid international format',
    amount: 'Please enter a valid amount (e.g., 1000 or 1000.50)',
  },
};

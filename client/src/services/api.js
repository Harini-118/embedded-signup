// client/src/services/api.js
const API_BASE_URL = 'https://embedded-signup.onrender.com/api'; // Hardcoded

export const exchangeToken = async (tokenData) => {
  console.log('Making API call to:', `${API_BASE_URL}/whatsapp/exchange-token`);
  console.log('Token data:', tokenData);
  
  const response = await fetch(`${API_BASE_URL}/whatsapp/exchange-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokenData)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('API error:', error);
    throw new Error(error.error || 'Failed to exchange token');
  }

  return response.json();
};

export const getCustomerStatus = async (customerId) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/customer/${customerId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get customer status');
  }

  return response.json();
};
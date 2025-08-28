// client/src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const META_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_CONFIGURATION_ID = import.meta.env.VITE_META_CONFIGURATION_ID;

export const exchangeToken = async (tokenData) => {
  const response = await fetch(`${API_BASE_URL}/whatsapp/exchange-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokenData)
  });

  if (!response.ok) {
    const error = await response.json();
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

// Export the Meta configuration if needed elsewhere
export { META_APP_ID, META_CONFIGURATION_ID };
// client/src/components/WhatsAppSignup.jsx
import React, { useEffect, useState } from 'react';
import { exchangeToken } from '../services/api';

const WhatsAppSignup = ({ onSignupComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Load Facebook SDK
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) return;
      
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      
      document.body.appendChild(script);
    };

    loadFacebookSDK();

    // Initialize Facebook SDK
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: process.env.REACT_APP_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v23.0'
      });
    };

    // Message event listener for session logging
    const handleMessage = (event) => {
      if (!event.origin.endsWith('facebook.com')) return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('Embedded Signup Event:', data);
          
          if (data.event === 'CANCEL') {
            if (data.data.current_step) {
              setError(`Flow abandoned at: ${data.data.current_step}`);
            } else if (data.data.error_message) {
              setError(`Error: ${data.data.error_message}`);
            }
          }
        }
      } catch (err) {
        console.log('Message event:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const fbLoginCallback = async (response) => {
    setIsLoading(false);
    
    if (response.authResponse) {
      const code = response.authResponse.code;
      console.log('Authorization code received:', code);
      
      // The message event should also fire with the WABA and phone number IDs
      // We'll handle the token exchange when we receive those
      setSuccess('Authorization successful! Processing...');
    } else {
      console.error('Login failed:', response);
      setError('Authorization failed. Please try again.');
    }
  };

  const launchWhatsAppSignup = () => {
    if (!window.FB) {
      setError('Facebook SDK not loaded. Please refresh and try again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    window.FB.login(fbLoginCallback, {
      config_id: process.env.VITE_META_CONFIGURATION_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: '', // Empty for default flow
        sessionInfoVersion: '3'
      }
    });
  };

  // Handle the complete flow data (called from message event)
  const handleCompleteSignup = async (signupData) => {
    try {
      const result = await exchangeToken({
        code: signupData.code, // You'll need to capture this from the callback
        wabaId: signupData.waba_id,
        phoneNumberId: signupData.phone_number_id,
        businessPortfolioId: signupData.business_id
      });

      setSuccess('Customer onboarded successfully!');
      if (onSignupComplete) {
        onSignupComplete(result);
      }
    } catch (error) {
      setError(`Onboarding failed: ${error.message}`);
    }
  };

  return (
    <div className="whatsapp-signup">
      <h2>Connect Your WhatsApp Business Account</h2>
      <p>Set up WhatsApp messaging for your business in just a few clicks.</p>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
      
      <button 
        onClick={launchWhatsAppSignup}
        disabled={isLoading}
        style={{
          backgroundColor: '#1877f2',
          border: 0,
          borderRadius: '4px',
          color: '#fff',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'bold',
          height: '40px',
          padding: '0 24px',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        {isLoading ? 'Loading...' : 'Connect WhatsApp Business'}
      </button>
      
      <div className="signup-info">
        <h3>What happens next?</h3>
        <ul>
          <li>You'll be guided through connecting your WhatsApp Business Account</li>
          <li>Your business phone number will be verified</li>
          <li>You'll need to add a payment method to your WhatsApp Business Account</li>
          <li>Once complete, you can start sending messages through our platform</li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppSignup;
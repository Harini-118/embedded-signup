// client/src/components/WhatsAppSignup.jsx
import React, { useEffect, useState } from 'react';
import { exchangeToken } from '../services/api';

const WhatsAppSignup = ({ onSignupComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sdkReady, setSdkReady] = useState(false); // Track SDK readiness

  useEffect(() => {
    // Load Facebook SDK
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        // SDK already loaded, check if FB is available
        if (window.FB) {
          setSdkReady(true);
        }
        return;
      }
      
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
        appId: import.meta.env.VITE_META_APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v23.0'
      });
      
      // Mark SDK as ready after initialization
      setSdkReady(true);
      console.log('Facebook SDK initialized successfully');
    };

    // Message event listener for session logging
    const handleMessage = (event) => {
      if (!event.origin.endsWith('facebook.com')) return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('Embedded Signup Event:', data);
          
          if (data.event === 'FINISH') {
            // Handle successful completion
            handleCompleteSignup({
              waba_id: data.data.waba_id,
              phone_number_id: data.data.phone_number_id,
              business_id: data.data.business_id,
              code: window.embeddedSignupCode
            });
          } else if (data.event === 'CANCEL') {
            if (data.data.current_step) {
              setError(`Flow abandoned at: ${data.data.current_step}`);
            } else if (data.data.error_message) {
              setError(`Error: ${data.data.error_message}`);
            }
            setIsLoading(false);
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

  const fbLoginCallback = (response) => {
    setIsLoading(false);
    
    if (response.authResponse) {
      const code = response.authResponse.code;
      console.log('Authorization code received:', code);
      
      // Store the code globally to use with message event data
      window.embeddedSignupCode = code;
      setSuccess('Authorization successful! Please wait for the final setup...');
    } else {
      console.error('Login failed:', response);
      setError('Authorization failed. Please try again.');
    }
  };

  const launchWhatsAppSignup = () => {
    // Check if SDK is ready
    if (!sdkReady || !window.FB) {
      setError('Facebook SDK not ready yet. Please wait a moment and try again.');
      return;
    }

    // Validate environment variables
    if (!import.meta.env.VITE_META_APP_ID || !import.meta.env.VITE_META_CONFIGURATION_ID) {
      setError('Missing Meta app configuration. Please check your environment variables.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    console.log('Launching WhatsApp signup with config:', {
      appId: import.meta.env.VITE_META_APP_ID,
      configId: import.meta.env.VITE_META_CONFIGURATION_ID
    });

    window.FB.login(fbLoginCallback, {
      config_id: import.meta.env.VITE_META_CONFIGURATION_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: '',
        sessionInfoVersion: '3'
      }
    });
  };

  // Handle the complete flow data (called from message event)
  const handleCompleteSignup = async (signupData) => {
    try {
      setIsLoading(true);
      console.log('Completing signup with data:', signupData);
      
      const result = await exchangeToken({
        code: signupData.code,
        wabaId: signupData.waba_id,
        phoneNumberId: signupData.phone_number_id,
        businessPortfolioId: signupData.business_id
      });

      setSuccess('Customer onboarded successfully!');
      if (onSignupComplete) {
        onSignupComplete(result);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      setError(`Onboarding failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="whatsapp-signup">
      <h2>Connect Your WhatsApp Business Account</h2>
      <p>Set up WhatsApp messaging for your business in just a few clicks.</p>
      
      {error && (
        <div style={{ color: 'red', padding: '10px', margin: '10px 0', border: '1px solid red', borderRadius: '4px' }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ color: 'green', padding: '10px', margin: '10px 0', border: '1px solid green', borderRadius: '4px' }}>
          {success}
        </div>
      )}
      
      {!sdkReady && (
        <div style={{ color: 'orange', padding: '10px', margin: '10px 0', border: '1px solid orange', borderRadius: '4px' }}>
          Loading Facebook SDK...
        </div>
      )}
      
      <button 
        onClick={launchWhatsAppSignup}
        disabled={isLoading || !sdkReady}
        style={{
          backgroundColor: '#1877f2',
          border: 0,
          borderRadius: '4px',
          color: '#fff',
          cursor: (isLoading || !sdkReady) ? 'not-allowed' : 'pointer',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: '16px',
          fontWeight: 'bold',
          height: '40px',
          padding: '0 24px',
          opacity: (isLoading || !sdkReady) ? 0.6 : 1
        }}
      >
        {isLoading ? 'Processing...' : !sdkReady ? 'Loading SDK...' : 'Connect WhatsApp Business'}
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
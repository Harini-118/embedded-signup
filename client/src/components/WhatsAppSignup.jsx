// client/src/components/WhatsAppSignup.jsx
import React, { useEffect, useState } from 'react';
import { exchangeToken } from '../services/api';

const WhatsAppSignup = ({ onSignupComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // REFACTORED: Use a single state object to collect all required data
  const [signupData, setSignupData] = useState({
    code: null,
    wabaId: null,
    phoneNumberId: null,
    businessId: null,
  });

  // Hardcoded values from your original code
  const APP_ID = '1213807479723042';
  const CONFIGURATION_ID = '1411808236443131';

  // Load Facebook SDK
  useEffect(() => {
    const loadFacebookSDK = () => {
      if (document.getElementById('facebook-jssdk')) {
        if (window.FB) setSdkReady(true);
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

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0' // Use a specific, non-beta version
      });
      setSdkReady(true);
      console.log('Facebook SDK initialized.');
    };

    loadFacebookSDK();

    // Event listener for data from the Embedded Signup popup
    const handleMessage = (event) => {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('Embedded Signup Event Received:', data);
          if (data.event === 'FINISH') {
            setSignupData((prev) => ({
              ...prev,
              wabaId: data.data.waba_id,
              phoneNumberId: data.data.phone_number_id,
              businessId: data.data.business_id,
            }));
          } else if (data.event === 'CANCEL') {
            const errorMessage = data.data?.error_message || `Flow abandoned at step: ${data.data?.current_step}`;
            setError(`Signup Cancelled: ${errorMessage}`);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.warn('Could not parse message from Facebook:', event.data);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // NEW: This useEffect hook reliably triggers the final step once all data is collected
  useEffect(() => {
    // Check if all required pieces of data are available
    if (signupData.code && signupData.wabaId && signupData.phoneNumberId) {
      console.log('All required data is present. Calling backend to complete onboarding...');
      handleCompleteSignup(signupData);
    }
  }, [signupData]); // This effect runs whenever signupData changes


  const handleCompleteSignup = async (data) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await exchangeToken({
        code: data.code,
        wabaId: data.wabaId,
        phoneNumberId: data.phoneNumberId,
        businessPortfolioId: data.businessId,
      });

      setSuccess('Account connected! Please complete the final step.');
      setOnboardingComplete(true); // Show the payment method instructions
      if (onSignupComplete) {
        onSignupComplete(result);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      setError(`Onboarding failed: ${error.message}. Check the console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const launchWhatsAppSignup = () => {
    if (!sdkReady || !window.FB) {
      setError('Facebook SDK is not ready. Please wait a moment and try again.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setOnboardingComplete(false);
    setSignupData({ code: null, wabaId: null, phoneNumberId: null, businessId: null });

    window.FB.login(
      (response) => {
        if (response.authResponse && response.authResponse.code) {
          console.log('Authorization code received from FB.login:', response.authResponse.code);
          // Just update the state. The useEffect will handle the rest.
          setSignupData((prev) => ({ ...prev, code: response.authResponse.code }));
        } else {
          console.error('Login failed or authorization denied:', response);
          setError('Authorization failed. Please try again.');
          setIsLoading(false);
        }
      },
      {
        config_id: CONFIGURATION_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: '2', // Use a stable version
        },
      }
    );
  };

  return (
    <div className="whatsapp-signup">
      <h2>Connect Your WhatsApp Business Account</h2>
      
      {error && <div style={{ color: 'red', border: '1px solid red', padding: '10px', margin: '10px 0' }}>{error}</div>}
      {success && <div style={{ color: 'green', border: '1px solid green', padding: '10px', margin: '10px 0' }}>{success}</div>}

      {onboardingComplete ? (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid green', borderRadius: '5px' }}>
          <h3>Final Step: Add a Payment Method</h3>
          <p>Your phone number is now connected. To send messages beyond the free monthly limit, you must add a payment method in your WhatsApp Manager.</p>
          <a
            href={`https://business.facebook.com/wa/manage/phone-numbers/${signupData.phoneNumberId}/`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontWeight: 'bold', color: '#1877f2' }}
          >
            Click here to go to your WhatsApp Manager and add payment details
          </a>
        </div>
      ) : (
        <>
          <p>Set up WhatsApp messaging for your business in just a few clicks.</p>
          <button
            onClick={launchWhatsAppSignup}
            disabled={isLoading || !sdkReady}
            style={{ backgroundColor: '#1877f2', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', opacity: (isLoading || !sdkReady) ? 0.6 : 1 }}
          >
            {isLoading ? 'Processing...' : !sdkReady ? 'Loading SDK...' : 'Connect with Facebook'}
          </button>
        </>
      )}
    </div>
  );
};

export default WhatsAppSignup;
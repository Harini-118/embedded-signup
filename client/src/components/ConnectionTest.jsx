// client/src/components/ConnectionTest.jsx
import React, { useState, useEffect } from 'react';

const ConnectionTest = () => {
  const [status, setStatus] = useState('Testing...');
  const [backendUrl] = useState(import.meta.env.VITE_API_URL);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing connection to:', backendUrl);
        
        const response = await fetch(`${backendUrl.replace('/api', '')}/api/health`);
        
        if (response.ok) {
          const data = await response.json();
          setStatus(`✅ Connected! Backend says: ${data.message}`);
        } else {
          setStatus(`❌ Connection failed with status: ${response.status}`);
        }
      } catch (error) {
        setStatus(`❌ Connection error: ${error.message}`);
        console.error('Connection test failed:', error);
      }
    };

    if (backendUrl) {
      testConnection();
    } else {
      setStatus('❌ No backend URL configured');
    }
  }, [backendUrl]);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px 0' }}>
      <h3>Backend Connection Test</h3>
      <p><strong>Backend URL:</strong> {backendUrl || 'Not configured'}</p>
      <p><strong>Status:</strong> {status}</p>
    </div>
  );
};

export default ConnectionTest;
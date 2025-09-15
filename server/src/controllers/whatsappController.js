// server/controllers/whatsappController.js
const Customer = require('../models/Customer');

// For using fetch in a CommonJS environment (like the default Node.js setup in your code)
// you need to install node-fetch: npm install node-fetch@2
const fetch = require('node-fetch');

class WhatsAppController {
  /**
   * Handles the core onboarding flow after the user completes the Embedded Signup.
   * 1. Exchanges the temporary code for a permanent business access token.
   * 2. Registers the user's phone number with the WhatsApp Cloud API (This changes the status from "Pending" to "Connected").
   * 3. Subscribes the WhatsApp Business Account (WABA) to the app for webhook notifications.
   * 4. Saves or updates the customer's details in the database.
   */
  async exchangeToken(req, res) {
    console.log('CONTROLLER: Received request on /exchange-token with body:', req.body);
    const { code, wabaId, phoneNumberId, businessPortfolioId } = req.body;

    if (!code || !wabaId || !phoneNumberId) {
      return res.status(400).json({
        error: 'Missing required parameters. `code`, `wabaId`, and `phoneNumberId` are all required.',
      });
    }

    try {
      // Step 1: Exchange the temporary code for a permanent business access token
      console.log('STEP 1: Exchanging authorization code for a business access token...');
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token`;
      const tokenParams = new URLSearchParams({
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          code: code,
      });

      const tokenResponse = await fetch(`${tokenUrl}?${tokenParams}`);
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.access_token) {
        console.error('ERROR at STEP 1: Token exchange failed.', tokenData);
        return res.status(400).json({
          error: 'Failed to exchange authorization code for a token.',
          details: tokenData.error?.message || 'No access token was returned by Meta.',
        });
      }
      const businessToken = tokenData.access_token;
      console.log('SUCCESS at STEP 1: Business access token obtained.');


      // Step 2: Register the phone number for the WhatsApp Cloud API.
      // THIS IS THE CRITICAL STEP TO CHANGE THE STATUS FROM "PENDING" to "CONNECTED".
      console.log(`STEP 2: Registering phone number ID (${phoneNumberId}) for the Cloud API...`);
      const registerUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/register`;
      const registerResponse = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${businessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: process.env.WHATSAPP_PIN || '654321', // Use a secure, consistent PIN
        }),
      });
      const registerData = await registerResponse.json();

      if (!registerResponse.ok || !registerData.success) {
        console.error('ERROR at STEP 2: Phone number registration failed.', registerData);
        return res.status(400).json({
          error: 'Failed to register the phone number for the WhatsApp API.',
          details: registerData.error?.message || 'The registration endpoint returned an error. This often happens if business verification is still pending.',
        });
      }
      console.log('SUCCESS at STEP 2: Phone number registered successfully.');


      // Step 3: Subscribe the WhatsApp Business Account (WABA) to our app's webhooks.
      console.log(`STEP 3: Subscribing WABA ID (${wabaId}) to our app for webhooks...`);
      const webhookUrl = `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`;
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${businessToken}`,
        },
      });
      const webhookData = await webhookResponse.json();

      // This step is often not critical for initial setup, so we'll log a warning instead of failing the whole process.
      if (!webhookResponse.ok || !webhookData.success) {
        console.warn('WARNING at STEP 3: Webhook subscription failed, but continuing onboarding.', webhookData);
      } else {
        console.log('SUCCESS at STEP 3: Webhook subscription successful.');
      }


      // Step 4: Save or update the customer's information in our database.
      console.log(`STEP 4: Saving customer data to the database for WABA ID ${wabaId}...`);
      const customer = await Customer.findOneAndUpdate(
        { wabaId: wabaId },
        {
          phoneNumberId: phoneNumberId,
          businessToken: businessToken, // IMPORTANT: For a real production app, you should encrypt this token before saving it to the database.
          businessPortfolioId: businessPortfolioId,
          onboardingStatus: 'completed',
        },
        { new: true, upsert: true } // `upsert: true` creates the document if it doesn't exist
      );
      console.log('SUCCESS at STEP 4: Customer onboarded and saved with DB ID:', customer._id);

      // Final success response to the client
      res.status(200).json({
        success: true,
        message: 'Customer onboarded successfully! The phone number is now connected.',
        customerId: customer._id,
      });

    } catch (error) {
      console.error('FATAL ERROR in exchangeToken controller:', error);
      res.status(500).json({
        error: 'An unexpected server error occurred during the onboarding process.',
        details: error.message,
      });
    }
  }

  /**
   * Handles incoming webhooks from Meta for both verification and events.
   */
  async handleWebhook(req, res) {
    // Handle the webhook verification challenge from Meta
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED: Verification successful.');
        return res.status(200).send(challenge);
      } else {
        console.error('WEBHOOK_VERIFICATION_FAILED: Tokens do not match.');
        return res.sendStatus(403); // Forbidden
      }
    }

    // Handle incoming event notifications
    if (req.method === 'POST') {
      try {
        const body = req.body;
        console.log('Webhook event received:', JSON.stringify(body, null, 2));

        // Process the webhook payload here (e.g., save incoming messages, update status, etc.)
        // Your logic to handle different types of notifications would go here.

        return res.sendStatus(200); // Acknowledge receipt of the event
      } catch (error) {
        console.error('Error processing webhook event:', error);
        return res.sendStatus(500); // Internal Server Error
      }
    }

    // If method is not GET or POST
    res.sendStatus(405); // Method Not Allowed
  }

  /**
   * Retrieves the status and details of an onboarded customer from the database.
   */
  async getCustomerStatus(req, res) {
    try {
      const { customerId } = req.params;
      
      // Find customer but exclude the sensitive business token from the response
      const customer = await Customer.findById(customerId).select('-businessToken');
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      res.status(200).json({
        success: true,
        customer: customer,
      });
    } catch (error) {
      console.error('Error retrieving customer status:', error);
      res.status(500).json({ error: 'Failed to retrieve customer status.', details: error.message });
    }
  }
}

module.exports = new WhatsAppController();
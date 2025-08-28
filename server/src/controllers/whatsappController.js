// server/controllers/whatsappController.js
const Customer = require('../models/Customer');
const axios = require('axios');

class WhatsAppController {
  
  // Exchange token code for business token
  async exchangeToken(req, res) {
    try {
      const { code, wabaId, phoneNumberId, businessPortfolioId } = req.body;
      
      if (!code || !wabaId || !phoneNumberId) {
        return res.status(400).json({ 
          error: 'Missing required parameters' 
        });
      }

      // Exchange code for business token
      const tokenResponse = await axios.post(
        `https://graph.facebook.com/v23.0/oauth/access_token`,
        {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          code: code
        }
      );

      const businessToken = tokenResponse.data.access_token;

      // Get business phone number details
      const phoneResponse = await axios.get(
        `https://graph.facebook.com/v23.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${businessToken}`
          }
        }
      );

      const businessPhoneNumber = phoneResponse.data.display_phone_number;

      // Register phone number for Cloud API
      await axios.post(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/register`,
        {
          messaging_product: 'whatsapp',
          pin: '123456' // You might want to make this configurable
        },
        {
          headers: {
            'Authorization': `Bearer ${businessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Subscribe to webhooks
      await axios.post(
        `https://graph.facebook.com/v23.0/${wabaId}/subscribed_apps`,
        {
          subscribed_fields: [
            'messages',
            'message_deliveries', 
            'message_reads',
            'message_reactions',
            'messaging_handovers'
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${businessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Save customer to database
      const customer = new Customer({
        wabaId,
        phoneNumberId,
        businessPhoneNumber,
        businessToken,
        businessPortfolioId,
        onboardingStatus: 'completed'
      });

      await customer.save();

      res.json({
        success: true,
        message: 'Customer onboarded successfully',
        customerId: customer._id,
        requiresPayment: true // Tech Providers require customers to add payment
      });

    } catch (error) {
      console.error('Token exchange error:', error.response?.data || error.message);
      res.status(500).json({
        error: 'Failed to onboard customer',
        details: error.response?.data || error.message
      });
    }
  }

  // Handle webhook events
  async handleWebhook(req, res) {
    try {
      const body = req.body;

      // Verify webhook (implement your verification logic)
      if (req.query['hub.mode'] === 'subscribe' && 
          req.query['hub.verify_token'] === process.env.WEBHOOK_VERIFY_TOKEN) {
        return res.send(req.query['hub.challenge']);
      }

      // Process webhook events
      if (body.object === 'whatsapp_business_account') {
        body.entry.forEach(entry => {
          entry.changes.forEach(change => {
            if (change.field === 'messages') {
              // Handle incoming messages
              this.handleIncomingMessage(change.value);
            } else if (change.field === 'account_update') {
              // Handle account updates
              this.handleAccountUpdate(change.value);
            }
          });
        });
      }

      res.sendStatus(200);
    } catch (error) {
      console.error('Webhook error:', error);
      res.sendStatus(500);
    }
  }

  async handleIncomingMessage(messageData) {
    // Process incoming WhatsApp messages
    console.log('Incoming message:', messageData);
    // Add your message processing logic here
  }

  async handleAccountUpdate(updateData) {
    // Handle account updates from Embedded Signup completions
    console.log('Account update:', updateData);
  }

  // Get customer status
  async getCustomerStatus(req, res) {
    try {
      const { customerId } = req.params;
      const customer = await Customer.findById(customerId);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new WhatsAppController();
// server/controllers/whatsappController.js
const Customer = require('../models/Customer');

class WhatsAppController {
  async exchangeToken(req, res) {
    try {
      const { code, wabaId, phoneNumberId, businessPortfolioId, customerInfo } = req.body;
      
      if (!code || !wabaId || !phoneNumberId) {
        return res.status(400).json({ 
          error: 'Missing required parameters: code, wabaId, and phoneNumberId are required' 
        });
      }

      console.log('Processing token exchange:', { wabaId, phoneNumberId });

      // Exchange code for business token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v23.0/oauth/access_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.META_APP_ID,
            client_secret: process.env.META_APP_SECRET,
            code: code
          })
        }
      );

      if (!tokenResponse.ok) {
        const error = await tokenResponse.json();
        console.error('Token exchange failed:', error);
        return res.status(400).json({ 
          error: 'Failed to exchange token', 
          details: error 
        });
      }

      const tokenData = await tokenResponse.json();
      const businessToken = tokenData.access_token;

      // Get business phone number details
      const phoneResponse = await fetch(
        `https://graph.facebook.com/v23.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${businessToken}`
          }
        }
      );

      if (!phoneResponse.ok) {
        const error = await phoneResponse.json();
        return res.status(400).json({ 
          error: 'Failed to get business phone number details', 
          details: error 
        });
      }

      const phoneData = await phoneResponse.json();
      const businessPhoneNumber = phoneData.display_phone_number;

      // Register phone number for Cloud API
      const registerResponse = await fetch(
        `https://graph.facebook.com/v23.0/${phoneNumberId}/register`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${businessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            pin: process.env.WHATSAPP_PIN || '123456'
          })
        }
      );

      if (!registerResponse.ok) {
        const error = await registerResponse.json();
        console.error('Phone registration failed:', error);
      }

      // Subscribe to webhooks
      const webhookResponse = await fetch(
        `https://graph.facebook.com/v23.0/${wabaId}/subscribed_apps`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${businessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subscribed_fields: [
              'messages',
              'message_deliveries', 
              'message_reads',
              'message_reactions',
              'messaging_handovers',
              'account_update'
            ]
          })
        }
      );

      if (!webhookResponse.ok) {
        const error = await webhookResponse.json();
        console.error('Webhook subscription failed:', error);
      }

      // Save customer to database
      let customer = await Customer.findOne({ wabaId });
      
      if (customer) {
        customer.phoneNumberId = phoneNumberId;
        customer.businessPhoneNumber = businessPhoneNumber;
        customer.businessToken = businessToken;
        customer.businessPortfolioId = businessPortfolioId;
        customer.onboardingStatus = 'completed';
        if (customerInfo) {
          customer.businessName = customerInfo.businessName || customer.businessName;
          customer.email = customerInfo.email || customer.email;
        }
      } else {
        customer = new Customer({
          wabaId,
          phoneNumberId,
          businessPhoneNumber,
          businessToken,
          businessPortfolioId,
          onboardingStatus: 'completed',
          businessName: customerInfo?.businessName,
          email: customerInfo?.email
        });
      }

      await customer.save();

      res.json({
        success: true,
        message: 'Customer onboarded successfully',
        customerId: customer._id,
        wabaId: customer.wabaId,
        phoneNumberId: customer.phoneNumberId,
        businessPhoneNumber: customer.businessPhoneNumber,
        requiresPayment: true
      });

    } catch (error) {
      console.error('Token exchange error:', error);
      res.status(500).json({
        error: 'Failed to onboard customer',
        details: error.message
      });
    }
  }

  async handleWebhook(req, res) {
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        console.error('Webhook verification failed');
        res.sendStatus(403);
      }
    } else {
      try {
        const body = req.body;
        console.log('Webhook received:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
          for (const entry of body.entry) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                console.log('Message received:', change.value);
              } else if (change.field === 'account_update') {
                console.log('Account update:', change.value);
              }
            }
          }
        }

        res.sendStatus(200);
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.sendStatus(500);
      }
    }
  }

  async getCustomerStatus(req, res) {
    try {
      const { customerId } = req.params;
      
      const customer = await Customer.findById(customerId).select('-businessToken');
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json({
        success: true,
        customer: customer
      });
    } catch (error) {
      console.error('Get customer error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new WhatsAppController();
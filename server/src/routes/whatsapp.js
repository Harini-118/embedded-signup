// server/routes/whatsapp.js
const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

// Exchange token and onboard customer
router.post('/exchange-token', whatsappController.exchangeToken);

// Webhook endpoint
router.get('/webhook', whatsappController.handleWebhook);
router.post('/webhook', whatsappController.handleWebhook);

// Get customer status
router.get('/customer/:customerId', whatsappController.getCustomerStatus);

module.exports = router;
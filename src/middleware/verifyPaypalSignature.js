const config = require('config');
const { verifyWebhookSignature } = require('../services/paypalService');
const { error, log } = console;

// Middleware to verify PayPal webhook signature
async function verifyPayPalSignature(req, res, next) {
  const signature = req.headers['paypal-transmission-sig'];
  const transmissionId = req.headers['paypal-transmission-id'];
  const timestamp = req.headers['paypal-transmission-time'];
  const authAlgo = req.headers['paypal-auth-algo'];
  const certUrl = req.headers['paypal-cert-url'];
  const webhookEvent = req.body;

  if (!signature || !transmissionId || !timestamp || !authAlgo || !certUrl) {
    return res.status(400).send('Missing or invalid headers');
  }

  const headers = {
    'paypal-transmission-sig': signature,
    'paypal-transmission-id': transmissionId,
    'paypal-transmission-time': timestamp,
    'paypal-auth-algo': authAlgo,
    'paypal-cert-url': certUrl
  };

  try {
    const isValid = await verifyWebhookSignature(webhookEvent, headers);

    if (!isValid) {
      return res.status(400).send('Invalid PayPal signature');
    }

    next();
  } catch (err) {
    error('Error verifying PayPal signature:', err);
    return res.status(500).send('Internal server error');
  }
}

module.exports = verifyPayPalSignature;

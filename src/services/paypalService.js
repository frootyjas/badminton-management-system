const config = require('config');
const { v4: uuidv4 } = require('uuid');
const { base64UrlEncode } = require('../utils/paypalUtils');
const { createUnsignedJWT } = require('../utils/paypalUtils');

const getAccessToken = async () => {
  const clientId = config.get('paypal').clientId;
  const clientSecret = config.get('paypal').secretKey;
  const base64Credentials = base64UrlEncode(`${clientId}:${clientSecret}`);

  const tokenResponse = await fetch(`${config.get('paypal').apiBaseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${base64Credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!tokenResponse.ok) {
    throw new Error(`Error fetching access token: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
};

const capturePayPalPayment = async (orderId) => {
  const accessToken = await getAccessToken();

  const captureResponse = await fetch(`${config.get('paypal').apiBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!captureResponse.ok) {
    throw new Error(`Error capturing PayPal payment: ${captureResponse.statusText}`);
  }

  const captureData = await captureResponse.json();
  return captureData;
};

async function createPayPalPayment(totalAmount, payerId, courtId, reservationId, returnUrl, cancelUrl) {
  const accessToken = await getAccessToken();
  const unsignedToken = createUnsignedJWT('badminton-app', payerId);

  const orderResponse = await fetch(`${config.get('paypal').apiBaseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': uuidv4()
      // 'PayPal-Auth-Assertion': unsignedToken
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'PHP',
            value: totalAmount,
            breakdown: {
              item_total: {
                currency_code: 'PHP',
                value: totalAmount
              }
            }
          }
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            brand_name: 'BATAAN BADMINTON',
            locale: 'en-US',
            shipping_preference: 'NO_SHIPPING',
            user_action: 'PAY_NOW',
            return_url:
              returnUrl ||
              `${config.get('frontendUrl')}/user/court-reservation?id=${courtId}&reservationId=${reservationId}`,
            cancel_url: cancelUrl || `${config.get('frontendUrl')}/user/court-reservation?id=${courtId}`
          }
        }
      }
    })
  });

  if (!orderResponse.ok) {
    throw new Error(`Error creating PayPal order: ${orderResponse.statusText}`);
  }

  return orderResponse.json();
}

const createPayPalPayout = async (recipientEmail, payoutAmount) => {
  const accessToken = await getAccessToken();

  const payoutResponse = await fetch(`${config.get('paypal').apiBaseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': uuidv4()
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: uuidv4(), // unique ID for each payout batch
        email_subject: 'You have a payment from BATAAN BADMINTON',
        email_message: 'You have a payment from BATAAN BADMINTON'
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: payoutAmount,
            currency: 'PHP'
          },
          receiver: recipientEmail, // court owner's PayPal email
          note: 'Payment for court reservation',
          sender_item_id: uuidv4()
        }
      ]
    })
  });

  if (!payoutResponse.ok) {
    throw new Error(`Error creating PayPal payout: ${payoutResponse.statusText}`);
  }

  const payoutData = await payoutResponse.json();
  console.log(payoutData);
  return payoutData;
};
const getPayPalPaymentDetails = async (orderId) => {
  const accessToken = await getAccessToken();

  const orderDetailsResponse = await fetch(`${config.get('paypal').apiBaseUrl}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!orderDetailsResponse.ok) {
    throw new Error(`Error fetching PayPal order details: ${orderDetailsResponse.statusText}`);
  }

  const orderDetails = await orderDetailsResponse.json();
  return orderDetails;
};

const verifyWebhookSignature = async (webhookEvent, headers) => {
  const accessToken = await getAccessToken();

  const verificationResponse = await fetch(
    `${config.get('paypal').apiBaseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: config.get('paypal').paypalWebhookId,
        webhook_event: webhookEvent
      })
    }
  );

  if (!verificationResponse.ok) {
    throw new Error(`Error verifying PayPal webhook: ${verificationResponse.statusText}`);
  }

  const verificationData = await verificationResponse.json();
  return verificationData.verification_status === 'SUCCESS';
};

module.exports = {
  createPayPalPayment,
  capturePayPalPayment,
  createPayPalPayout,
  getPayPalPaymentDetails,
  verifyWebhookSignature
};

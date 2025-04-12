const path = require('path');

module.exports = {
  mongodb: {
    uri: process.env.DB_URI,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    tls: true,
    tlsCAFile: [path.join(__dirname, '../certs/evennode.pem')]
  },
  gmail: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  port: process.env.PORT || 3000,
  frontendUrl: process.env.FRONTEND_URL,
  disableSecurity: process.env.DISABLE_SECURITY === 'true',
  cookieOptions: {
    maxAge: 60 * 60 * 1000, // 60 minutes in milliseconds
    httpOnly: true,
    secure: process.env.DISABLE_SECURITY === 'false',
    sameSite: 'lax'
  },
  r2: {
    authKey: process.env.R2_AUTH_KEY, // Store your custom auth key
    uploadUrl: process.env.R2_UPLOAD_URL // Store your R2 upload URL
  },
  maxFileSize: new Function(`return ${process.env.MAX_FILE_SIZE}`)(),
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    secretKey: process.env.PAYPAL_SECRET_KEY,
    paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID
  }
};

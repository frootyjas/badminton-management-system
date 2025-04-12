const { log, error } = console;

const requiredEnvVars = [
  'DB_URI',
  'DB_USERNAME',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'NODE_ENV',
  'FRONTEND_URL',
  'PORT',
  'HOST_DEV',
  'HOST_PROD',
  'DISABLE_SECURITY',
  'MAX_FILE_SIZE',
  'R2_AUTH_KEY',
  'R2_UPLOAD_URL',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_SECRET_KEY',
  'PAYPAL_WEBHOOK_ID'
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

console.log('All required environment variables are set.');

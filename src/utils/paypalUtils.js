const base64UrlEncode = (str) => {
  return Buffer.from(str).toString('base64url');
};

const createUnsignedJWT = (issuer, payerId) => {
  const header = {
    alg: 'none',
    typ: 'JWT'
  };

  const payload = {
    iss: issuer,
    payer_id: payerId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 // optional: set expiration to 1 hour
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // construct unsigned JWT
  return `${encodedHeader}.${encodedPayload}.`;
};

module.exports = { base64UrlEncode, createUnsignedJWT };

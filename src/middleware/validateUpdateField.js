const validateUpdateFields = (req, res, next) => {
  const {
    isVerified,
    role,
    id,
    otp,
    refreshToken,
    otpExpires,
    __v,
    _id,
    verificationNonce,
    resetPasswordNonce,
    ...otherInfo
  } = req.body;
  const userRole = req.user.role;

  // define sensitive fields and their allowed roles
  const sensitiveFields = {
    isVerified: [''],
    role: [''], // example: Only admins can update role
    id: [''],
    otp: [''],
    refreshToken: [''],
    otpExpires: [''],
    __v: [''],
    _id: [''],
    verificationNonce: [''],
    resetPasswordNonce: ['']
  };

  // check each sensitive field
  for (const [field, allowedRoles] of Object.entries(sensitiveFields)) {
    if (req.body[field] !== undefined && !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: 'error',
        code: 403,
        message: `You are not allowed to update the field: ${field}.`
      });
    }
  }

  // Continue to the next middleware or route handler
  next();
};

module.exports = validateUpdateFields;

const User = require('../models/User');
const Court = require('../models/Court');
const { log, error } = console;
const { generateAccessToken, generateRefreshToken, generateNonce } = require('../utils/generateToken');
const { addToBlacklist, isTokenBlacklisted } = require('../utils/blackListUtils');
const { handleMultipleFileUploads, handleFileUpload } = require('../utils/fileUpload');
const config = require('config');
const jwt = require('jsonwebtoken');
const { Buffer } = require('buffer');
const { sendOTP, sendForgotPasswordEmail } = require('../services/emailService');
const { deleteUserFilesAndProfilePhoto } = require('../utils/fileCleanup');
const Reservation = require('../models/Reservation');
const { getUserSocket } = require('../utils/userSocketManager');
const Superadmin = require('../models/SuperAdmin');

exports.loginUser = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;

    // check if the role is 'superadmin'
    if (role.toLowerCase() === 'superadmin') {
      const superAdmin = await Superadmin.findOne({ username }).select('+password');
      if (!superAdmin) {
        return res.status(401).json({
          success: false,
          code: 401,
          message: 'Superadmin not found.'
        });
      }

      // validate password
      const isMatch = await superAdmin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          code: 401,
          message: 'Invalid email or password for superadmin'
        });
      }

      // generate access and refresh tokens for superadmin
      const accessToken = superAdmin.generateToken('access');
      const refreshToken = superAdmin.generateToken('refresh');

      // define cookie options
      const cookieOptions = config.get('cookieOptions');
      const accessCookieOptions = { ...cookieOptions, maxAge: 60 * 60 * 1000 }; // 1 hour
      const refreshCookieOptions = { ...cookieOptions, maxAge: 14 * 24 * 60 * 60 * 1000 }; // 14 days

      // redirect URL for superadmin
      const redirectUrl = '/superadmin/dashboard';

      return res
        .status(200)
        .cookie('accessToken', accessToken, accessCookieOptions)
        .cookie('refreshToken', refreshToken, refreshCookieOptions)
        .json({
          success: true,
          action: 'redirect',
          code: 200,
          message: 'Superadmin logged in successfully.',
          redirectUrl
        });
    }

    // find the user by username
    const user = await User.findOne({ username }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: 'User not found.'
      });
    }

    // validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 401,
        message: 'Invalid username or password'
      });
    }

    // check if the user's role matches the specified role
    if (user.role !== role.toLowerCase()) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'User role does not match the specified role'
      });
    }

    // if the user is an admin
    if (user.role === 'admin') {
      // if the admin is not verified
      if (!user.isVerified) {
        // check if the admin has registered a court
        if (!user.hasRegisteredCourt) {
          // Generate a unique nonce for verification
          const nonce = await generateNonce(user.email, 'verification');

          // create a JWT token for verification with email and nonce
          const generateEmailVerificationToken = (email, nonce) => {
            return jwt.sign({ email, nonce }, config.get('jwtSecret'), {
              expiresIn: '20m' // Token valid for 20 minutes
            });
          };

          const token = generateEmailVerificationToken(user.email, nonce);

          // Generate a unique nonce for court registration
          const courtRegNonce = await generateNonce(user.email, 'courtRegistration');
          const generateAdminToken = (userId, role, nonce) => {
            return jwt.sign({ id: userId, role, nonce }, config.get('jwtSecret'), {
              expiresIn: '1h' // Token valid for 1 hour
            });
          };

          const adminToken = generateAdminToken(user._id, user.role, courtRegNonce);

          return res.status(200).json({
            success: true,
            code: 200,
            message: 'Please verify your account first.',
            action: 'verify',
            verificationUrl: `/verification?token=${token}&next=${encodeURIComponent(
              `/register/courts?token=${adminToken}`
            )}`
          });
        }
      }

      // If the admin is verified but has not registered a court
      if (!user.hasRegisteredCourt) {
        // generate a unique nonce for court registration
        const courtRegNonce = await generateNonce(user.email, 'courtRegistration');
        const adminToken = jwt.sign({ id: user._id, role: user.role, nonce: courtRegNonce }, config.get('jwtSecret'), {
          expiresIn: '1h'
        });

        return res.status(200).json({
          success: true,
          code: 200,
          action: 'incomplete',
          message: 'You are verified but need to complete court registration first.',
          redirectUrl: `/register/courts?token=${adminToken}`
        });
      }

      // if the user has registered a court, check court status
      const userWithCourt = await User.findOne({ _id: user._id }).populate('court');
      const court = userWithCourt.court;

      // if court registration is neither approved nor rejected
      if (court.status === 'pending') {
        return res.status(403).json({
          success: true,
          action: 'pending',
          code: 403,
          message: 'Court registration is still pending approval.'
        });
      }

      // if the court is rejected
      if (court.status === 'rejected') {
        return res.status(409).json({
          success: false,
          action: 'rejected',
          code: 409,
          message: 'Your court registration has been rejected.'
        });
      }
    }

    // If the user is not an admin
    if (!user.isVerified) {
      const nonce = await generateNonce(user.email, 'verification');
      const token = generateEmailVerificationToken(user.email, nonce);
      await sendOTP(user.email);

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Please verify your account first.',
        action: 'verify',
        verificationUrl: `/verification?token=${token}`
      });
    }

    // if the user is not verified and is not an admin, send verification data
    if (!user.isVerified) {
      // generate a unique nonce
      const nonce = await generateNonce(user.email, 'verification');

      // create a JWT token for verification with email and nonce
      const generateEmailVerificationToken = (email, nonce) => {
        return jwt.sign({ email, nonce }, config.get('jwtSecret'), {
          expiresIn: '20m' // Token valid for 20 minutes or adjust as needed
        });
      };

      const token = generateEmailVerificationToken(user.email, nonce);

      await sendOTP(user.email);

      return res.status(200).json({
        success: true,
        code: 200,
        message: 'Please verify your account first.',
        action: 'verify',
        verificationUrl: `/verification?token=${token}`
      });
    }

    const cookieOptions = config.get('cookieOptions');

    // generate access token and refresh token for user
    const accessToken = await generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // define cookie options for access token (15 minutes)
    const accessCookieOptions = {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000 // 60 minutes
    };

    // define cookie options for refresh token (7 days)
    const refreshCookieOptions = {
      ...cookieOptions,
      maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
    };

    log(refreshCookieOptions);

    // Determine redirect URL based on user role
    let redirectUrl;
    if (user.role === 'admin') {
      redirectUrl = '/user/admin/view-post';
    } else if (user.role === 'player' || user.role === 'coach') {
      redirectUrl = '/user/dashboard';
    }

    return res
      .status(200)
      .cookie('accessToken', accessToken, accessCookieOptions)
      .cookie('refreshToken', refreshToken, refreshCookieOptions)
      .json({
        success: true,
        action: 'redirect',
        code: 200,
        message: 'You have successfully logged in.',
        redirectUrl
      });
  } catch (err) {
    error('Error occurred while logging the user:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.registerUser = async (req, res, next) => {
  try {
    const {
      first_name,
      middle_name,
      last_name,
      email,
      username,
      password,
      confirm_password,
      gender,
      date_of_birth,
      municipality,
      contact_number,
      role
    } = req.body;

    // check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Email already exists'
      });
    }

    // Create a new user object
    const newUser = new User({
      first_name,
      middle_name,
      last_name,
      email,
      username,
      password,
      confirm_password,
      gender,
      date_of_birth,
      municipality,
      contact_number,
      isVerified: false,
      otp: null, // initialize OTP as null
      otpExpires: null, // initialize OTP expiration
      role
    });

    // save the user to the database
    await newUser.save();

    // generate a unique nonce
    const nonce = await generateNonce(email, 'verification');
    // const generateNonce = () => crypto.randomBytes(16).toString('hex');

    // create a JWT token for verification with email and nonce
    const generateEmailVerificationToken = (email, nonce) => {
      return jwt.sign({ email, nonce }, config.get('jwtSecret'), {
        expiresIn: '20m' // Token valid for 20 minutes or adjust as needed
      });
    };

    const token = generateEmailVerificationToken(email, nonce);

    await sendOTP(email);

    if (newUser.isAdmin) {
      // Generate a separate token for the admin to be used in /register/court
      // generate a unique nonce
      const courtRegNounce = await generateNonce(email, 'courtRegistration');

      log(courtRegNounce);

      const generateAdminToken = (userId, role, nonce) => {
        return jwt.sign({ id: userId, role: role, nonce: nonce }, config.get('jwtSecret'), {
          expiresIn: '1h'
        });
      };

      const adminToken = generateAdminToken(newUser._id, newUser.role, courtRegNounce);

      return res.status(201).json({
        success: true,
        action: 'redirect',
        code: 201,
        message: 'Thank you for registering with us. Your account has been sucessfully created.',
        redirectUrl: `/verification?token=${token}&next=${encodeURIComponent(`/register/courts?token=${adminToken}`)}`
      });
    }

    // verification page with  token
    return res.status(201).json({
      success: true,
      action: 'redirect',
      code: 201,
      message: 'Thank you for registering with us. Your account has been successfully created.',
      redirectUrl: `/verification?token=${token}&next=${encodeURIComponent('/login')}`
    });
  } catch (err) {
    error('Error registering user:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    // Get the session cookie or Authorization header
    const authHeader = req.headers['cookie'];

    // If neither are present, send an Unauthorized error
    if (!authHeader) return res.sendStatus(401);

    let accessToken, refreshToken;

    // extract the token from the correct cookie name
    if (req.headers['cookie']) {
      // Split the cookie string into key-value pairs
      const cookies = authHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});

      accessToken = cookies['accessToken'];
      refreshToken = cookies['refreshToken'];
    }

    // check if the access token is blacklisted
    const isAccessTokenBlacklisted = await isTokenBlacklisted(accessToken, 'access');
    const isRefreshTokenBlacklisted = await isTokenBlacklisted(refreshToken, 'refresh');

    // if either the access token or the refresh token is blacklisted, send a no content response
    if (isAccessTokenBlacklisted || isRefreshTokenBlacklisted) {
      return res.sendStatus(403); // tokens are blacklisted, proceed with no content response
    }

    if (accessToken) {
      // otherwise blacklist token
      await addToBlacklist(accessToken, 'access');
    }

    // blacklist refresh token (if present)
    if (refreshToken) {
      await addToBlacklist(refreshToken, 'refresh');
    }

    // assume the user's ID is stored in req.user after authentication
    const userId = req.user.id;

    // Find the user by ID
    const user = await User.findById(userId);

    await deleteUserFilesAndProfilePhoto(userId); // Delete files associated with the admin

    // Check if the user was found
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: 'User not found'
      });
    }

    // find the user by ID and delete the account
    await User.findByIdAndDelete(userId);

    const { maxAge, ...cookieOptions } = config.get('cookieOptions');

    // clear request cookie on client
    return res
      .status(200)
      .setHeader('Clear-Site-Data', '"cookies"')
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json({
        success: true,
        code: 200,
        message: 'Account deleted sucessfully'
      });
  } catch (err) {
    error('Error occurred while deleting the account:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.logoutUser = async (req, res, next) => {
  try {
    // Get the session cookie or Authorization header
    const authHeader = req.headers['cookie'];

    // If neither are present, send an Unauthorized error
    if (!authHeader) return res.sendStatus(401);

    let accessToken, refreshToken;

    // If it's from the cookie, extract the token from the correct cookie name
    if (req.headers['cookie']) {
      // Split the cookie string into key-value pairs
      const cookies = authHeader.split(';').reduce((acc, cookie) => {
        const [name, value] = cookie.trim().split('=');
        acc[name] = value;
        return acc;
      }, {});

      accessToken = cookies['accessToken'];
      refreshToken = cookies['refreshToken'];
    }

    // check if the access token is blacklisted
    const isAccessTokenBlacklisted = await isTokenBlacklisted(accessToken, 'access');
    const isRefreshTokenBlacklisted = await isTokenBlacklisted(refreshToken, 'refresh');

    // if either the access token or the refresh token is blacklisted, send a no content response
    if (isAccessTokenBlacklisted || isRefreshTokenBlacklisted) {
      return res.sendStatus(403); // tokens are blacklisted, proceed with no content response
    }

    // otherwise blacklist token
    if (accessToken) {
      await addToBlacklist(accessToken, 'access');
    }

    // blacklist refresh token (if present)
    if (refreshToken) {
      await addToBlacklist(refreshToken, 'refresh');
    }

    // find the user and remove the refresh token
    await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: { refreshToken: null }
      },
      { new: true }
    );

    const { maxAge, ...cookieOptions } = config.get('cookieOptions');

    // clear request cookie on client
    return res
      .status(200)
      .setHeader('Clear-Site-Data', '"cookies"')
      .clearCookie('accessToken', cookieOptions)
      .clearCookie('refreshToken', cookieOptions)
      .json({
        success: true,
        code: 200,
        message: 'Logged out successfully.'
      });
  } catch (err) {
    error('Error occurred while logging out the user:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.verifyEmail = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { otp } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Check if the token is blacklisted
    const isVerificationTokenBlacklisted = await isTokenBlacklisted(token, 'verify');
    if (isVerificationTokenBlacklisted) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'Invalid Token'
      });
    }
    // Verify the token synchronously
    const decoded = jwt.verify(token, config.get('jwtSecret'));

    // Find the user by email
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: 'User not found'
      });
    }

    // Convert both OTPs to strings and trim any whitespace
    const storedOtp = user.otp?.toString().trim();
    const providedOtp = otp?.toString().trim();

    // Check if the OTP is valid
    if (storedOtp !== providedOtp) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP has expired
    const currentTime = Date.now();
    if (user.otpExpires && user.otpExpires < currentTime) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'OTP has expired'
      });
    }

    // Check if the nonce in the token matches the stored nonce
    if (decoded.nonce !== user.verificationNonce) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid or expired token'
      });
    }

    // Mark email as verified
    user.isVerified = true;
    user.otp = null; // Clear OTP after successful verification
    user.otpExpires = null; // Clear the expiration as well
    user.verificationNonce = null;

    await user.save();

    // Add the token to the blacklist
    await addToBlacklist(token, 'verify');

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Email verified successfully'
    });
  } catch (err) {
    console.error('Error during verification check:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.refreshToken = async (req, res, next) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  // If no refresh token is present, deny access
  if (!incomingRefreshToken) {
    return res.status(401).json({
      success: false,
      code: 200,
      message: 'Refresh token not found'
    });
  }

  try {
    // Check if the refresh token is blacklisted
    const isRefreshTokenBlacklisted = await isTokenBlacklisted(incomingRefreshToken, 'refresh');
    if (isRefreshTokenBlacklisted) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'Refresh token is blacklisted'
      });
    }

    const decoded = jwt.verify(incomingRefreshToken, config.get('jwtRefreshSecret'));

    // Find the user associated with the refresh token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    console.log('Incoming refresh token:', incomingRefreshToken);
    console.log('User refresh token from DB:', user.refreshToken);

    // If refresh token in DB does not match the incoming refresh token
    if (user.refreshToken !== incomingRefreshToken) {
      return res.status(401).json({ message: 'Refresh token is incorrect' });
    }

    const incomingAccessToken = req.cookies.accessToken || req.body.accessToken;

    // Check if the access token is blacklisted
    const isAccessTokenBlacklisted = await isTokenBlacklisted(incomingAccessToken, 'access');
    if (!isAccessTokenBlacklisted && incomingAccessToken) {
      await addToBlacklist(incomingAccessToken, 'access');
    }

    const cookieOptions = config.get('cookieOptions');

    // define cookie options for access token (15 minutes)
    const accessCookieOptions = {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000 // 60 minutes
    };

    // Generate new access token
    const accessToken = await generateAccessToken(decoded.id);

    return res.status(200).cookie('accessToken', accessToken, accessCookieOptions).json({
      success: true,
      code: 201,
      message: 'Access token refreshed'
    });
  } catch (err) {
    error('Error occurred while refreshing token:', err);
    return res.status(500).json({
      status: 'error',
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.resetPassword = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 401,
      message: 'No token provided'
    });
  }

  const { newPassword, confirm_password } = req.body;

  try {
    // Check if the refresh token is blacklisted
    const isResetPasswordTokenBlacklisted = await isTokenBlacklisted(token, 'reset');
    if (isResetPasswordTokenBlacklisted) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'Invalid token'
      });
    }

    // verify the JWT token
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    // find the user by ID from the decoded token
    const user = await User.findById(decoded.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: 'User not found'
      });
    }

    // check if the nonce in the token matches the stored nonce
    if (decoded.nonce !== user.resetPasswordNonce) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Invalid or expired token'
      });
    }

    // check if the reset password nonce has expired
    if (Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Reset password link has expired'
      });
    }

    // check if the new password is the same as the old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'New password cannot be the same as the old password'
      });
    }

    // update user's password
    user.confirm_password = confirm_password;
    user.password = newPassword;
    user.resetPasswordNonce = null; // Clear the nonce
    user.resetPasswordExpires = null; // Clear the expiration
    await user.save();

    await addToBlacklist(token, 'reset');

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Password has been reset successfully'
    });
  } catch (err) {
    error('Error during reset password:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email: encodedEmail } = req.body;
  const decodedEmail = Buffer.from(encodedEmail, 'base64').toString();

  if (!decodedEmail) {
    return res.status(400).json({
      success: false,
      code: 400,
      message: 'Email is required'
    });
  }

  try {
    const user = await User.findOne({ email: decodedEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: 'User not found'
      });
    }

    // generate a unique nonce
    const nonce = await generateNonce(user.email, 'passwordReset');

    // create a JWT containing the nonce and user ID
    const resetToken = jwt.sign(
      { id: user._id, nonce: nonce },
      config.get('jwtSecret'),
      { expiresIn: '10m' } // Token expires in 10 min
    );

    await user.save();

    // Send email with the reset link containing the JWT
    await sendForgotPasswordEmail(decodedEmail, resetToken);

    return res.status(200).json({
      success: true,
      code: 200,
      message: 'Reset password link has been sent to your email.',
      resetToken
    });
  } catch (err) {
    error('Error during forgot password:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.registerCourt = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 401,
      message: 'No token provided'
    });
  }

  try {
    // Check if the token is blacklisted
    const isResetPasswordTokenBlacklisted = await isTokenBlacklisted(token, 'courtAccess');
    if (isResetPasswordTokenBlacklisted) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'Invalid token'
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, config.get('jwtSecret'));

    // Find the admin user
    const user = await User.findById(decoded.id).select('+isAdmin');

    if (!user) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'User not found'
      });
    }

    if (!user.isAdmin) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'Only admins can register courts.'
      });
    }

    // Check if the admin has already registered a court
    if (user.hasRegisteredCourt) {
      return res.status(403).json({
        success: false,
        code: 403,
        message: 'Court has already been registered'
      });
    }

    // Extract court registration data from the request body
    const {
      business_name,
      contact_number,
      business_email,
      hourly_rate,
      description,
      paypal_email,
      dti_number,
      court_latitude,
      court_longitude
    } = req.body;

    const operating_hours = {
      from: req.body['operating_hours_from'],
      to: req.body['operating_hours_to']
    };

    log(req.body);

    // Validate required fields
    if (!business_name || !contact_number || !business_email || !hourly_rate || !paypal_email || !dti_number || !description) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'All fields must be filled out'
      });
    }

    // Validate operating hours
    if (!operating_hours.from || !operating_hours.to) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Operating hours must be provided'
      });
    }

    // Check if required files are provided
    if (!req.files.business_logo) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Business logo is required'
      });
    }

    if (!req.files['court_image[]'] || req.files['court_image[]'].length === 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'At least one court image is required'
      });
    }

    if (!req.files['facility_image[]'] || req.files['facility_image[]'].length === 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'At least one facility image is required'
      });
    }

    // Validate documents
    const documentKeys = [
      'business_permit',
      'dti',
      'bir',
      'sanitary_permit',
      'barangay_clearance',
      'non_coverage',
      'dole_registration'
    ];

    for (const key of documentKeys) {
      const documentKey = `documents[${key}]`; // Format the document key

      if (!req.files[documentKey]) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: `${key.replace(/_/g, ' ')} is required`
        });
      }
    }

    // Initialize URLs
    let businessLogoUrl,
      courtImageUrls = [],
      facilityData = [],
      documentUrls = {}; // Change to an object to store URLs by key

    // Upload facility name and match with facility names
    let facilityNames = req.body['facility_name[]'];

    if (typeof facilityNames === 'string') {
      facilityNames = [facilityNames]; // Convert to array
    }
    log(facilityNames);
    //  handle cases where facilityNames might be empty after this
    if (!facilityNames || facilityNames.length === 0) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'At least one facility name is required.'
      });
    }

    // handle the facility images and names validation
    const facilityImages = req.files['facility_image[]'];

    let facilityImageArray = Array.isArray(facilityImages) ? facilityImages : [facilityImages];

    if (facilityImageArray.length !== facilityNames.length) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: 'Each facility name must have a corresponding facility image.'
      });
    }

    const allowedImages = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedDocs = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    for (let i = 0; i < facilityImages.length; i++) {
      const imageUrl = await handleFileUpload(facilityImages[i], decoded.id, 'facilityImage', allowedImages);
      facilityData.push({
        name: facilityNames[i],
        image: imageUrl
      });
    }

    // Upload business logo
    businessLogoUrl = await handleFileUpload(req.files.business_logo, decoded.id, 'businessLogo', allowedImages);

    // Upload court images (multiple)
    // courtImageUrls = await handleMultipleFileUploads(req.files.court_images, decoded.id);
    courtImageUrls = await handleMultipleFileUploads(
      req.files['court_image[]'],
      decoded.id,
      'courtImage',
      allowedImages
    );

    // Upload documents (multiple)
    for (const key of documentKeys) {
      const documentKey = `documents[${key}]`; // Format the document key
      const file = req.files[documentKey];

      if (Array.isArray(file)) {
        // Handle multiple files
        documentUrls[key] = await Promise.all(
          file.map((f) => handleFileUpload(f, decoded.id, 'businessDocuments', allowedDocs))
        );
      } else {
        // Handle single file
        documentUrls[key] = await handleFileUpload(file, decoded.id, 'businessDocuments', allowedDocs);
      }
    }

    // Create a new court document
    const newCourt = new Court({
      business_name,
      contact_number,
      business_email,
      operating_hours,
      hourly_rate,
      paypal_email,
      dti_number,
      description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(court_longitude), parseFloat(court_latitude)] // [longitude, latitude]
      },
      business_logo: businessLogoUrl,
      court_images: courtImageUrls,
      facilities: facilityData,
      documents: documentUrls, // Store all document URLs directly
      user: user._id
    });

    const savedCourt = await newCourt.save();

    // Update the user's document to link the court
    user.court = savedCourt._id;
    user.hasRegisteredCourt = true;
    user.courtRegistrationNonce = null; // Optionally reset the nonce
    await user.save();

    // Blacklist the token after successful court registration
    await addToBlacklist(token, 'courtAccess');

    return res.status(201).json({
      success: true,
      code: 201,
      message: 'Court registered successfully'
    });
  } catch (err) {
    error('Error during court registration:', err);
    return res.status(500).json({
      success: false,
      code: 500,
      message: 'Internal Server Error'
    });
  }
};

exports.paypalWebhookHandler = async (req, res) => {
  const webhookEvent = req.body;

  console.log('Received PayPal webhook event:', webhookEvent);

  if (webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {
    const payerId = webhookEvent.resource.payer.payer_id;

    try {
      // find the reservation using the payerId
      const reservation = await Reservation.findOne({ payerId });

      if (reservation) {
        // get the user ID from the reservation
        const userId = reservation.user;

        // get the user socket for the current user
        const userSocket = getUserSocket(userId.toString());

        // notify the frontend
        if (userSocket) {
          userSocket.emit('paymentSuccess', {
            message: 'Payment was successful! Your reservation is confirmed.'
          });
        }
      } else {
        console.log(`No reservation found for payerId: ${payerId}`);
      }
    } catch (error) {
      console.error('Error fetching reservation:', error);
      return res.status(500).send('Internal Server Error');
    }
  }

  res.status(200).send('OK');
};

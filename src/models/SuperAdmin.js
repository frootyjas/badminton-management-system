const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('config');
const jwt = require('jsonwebtoken');

const superAdminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      select: false // prevents password from being returned in queries
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: ['superadmin'],
        message: 'Role must be Superadmin.'
      }
    }
  },
  {
    timestamps: true,
    strict: 'throw'
  }
);

// hash the password before saving
superAdminSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// method to compare password
superAdminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// method to generate JWT token
superAdminSchema.methods.generateToken = function (type) {
  const payload = {
    id: this._id,
    role: this.role
  };

  if (type === 'access') {
    // generate an access token (short-lived)
    return jwt.sign(payload, config.jwtSecret, { expiresIn: '1d', algorithm: 'HS256' });
  }

  if (type === 'refresh') {
    // generate a refresh token (long-lived)
    return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '14d', algorithm: 'HS256' });
  }

  throw new Error('Invalid token type');
};

superAdminSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    // remove password field and any other unwanted field
    delete ret.password;

    ret.fullName = `${ret.firstName} ${ret.lastName}`;
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

const Superadmin = mongoose.model('Superadmin', superAdminSchema);

module.exports = Superadmin;

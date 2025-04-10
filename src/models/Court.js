const mongoose = require('mongoose');

const courtRegistrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    business_name: {
      type: String,
      trim: true,
      default: ''
    },
    contact_number: {
      type: String,
      match: [/^\d{10,15}$/, 'Please enter a valid contact number'],
      default: ''
    },
    business_email: {
      type: String,
      lowercase: true,
      validate: {
        validator: function (value) {
          const validDomains = ['gmail.com', 'yahoo.com', 'googlemail.com'];
          const domain = value.split('@')[1];
          return validDomains.includes(domain);
        },
        message: 'Email must be from Gmail, Yahoo, or Googlemail.'
      },
      default: ''
    },
    operating_hours: {
      from: {
        type: String,
        default: ''
      },
      to: {
        type: String,
        default: ''
      }
    },
    hourly_rate: {
      type: Number,
      min: [0, 'Hourly rate must be a positive number'],
      default: 0
    },
    business_logo: {
      type: String,
      default: ''
    },
    court_images: {
      type: [String],
      default: []
    },
    facilities: {
      type: [
        {
          image: {
            type: String,
            default: ''
          },
          name: {
            type: String,
            default: ''
          }
        }
      ],
      default: []
    },
    paypal_email: {
      type: String,
      default: ''
    },
    dti_number: {
      type: String,
      default: function () {
        return this.role === 'admin' ? null : undefined;
      },
    },
    status: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending' // Default to 'pending' when the court registration is neither approved nor rejected
    },
    documents: {
      business_permit: {
        type: [String],
        default: []
      },
      dti: {
        type: [String],
        default: []
      },
      bir: {
        type: [String],
        default: []
      },
      sanitary_permit: {
        type: [String],
        default: []
      },
      barangay_clearance: {
        type: [String],
        default: []
      },
      non_coverage: {
        type: [String],
        default: []
      },
      dole_registration: {
        type: [String],
        default: []
      }
    },
    description: {
      type: String,
      default: ''
    },
    location: {
      type: { type: String, enum: ['Point'], required: true }, // GeoJSON type
      coordinates: {
        type: [Number], // Array of [longitude, latitude]
        required: true
      }
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

courtRegistrationSchema.virtual('totalCourts').get(function () {
  return this.court_images ? this.court_images.length : undefined;
});

// create a compound index for geospatial queries
courtRegistrationSchema.index({ location: '2dsphere' });

const Court = mongoose.model('Court', courtRegistrationSchema);
module.exports = Court;

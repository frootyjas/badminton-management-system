const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    stock: {
      type: Number,
      required: true
    },
    salesCount: {
      type: Number,
      default: 0
    },
    category: {
      type: String,
      enum: ['Shoes', 'Racket', 'Apparel', 'Bag', 'Shuttlecock'],
      required: true
    }
  },
  {
    timestamps: true,
    strict: 'throw'
  }
);

const Product = mongoose.model('Product', productSchema);

module.exports = Product;

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      minlength: [3, 'Category name must be at least 3 characters long'],
      maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    participantLimit: {
      type: Number,
      required: true,
      min: [1, 'Participant limit must be at least 1'],
      max: [100, 'Participant limit cannot exceed 100']
    }
  },
  {
    timestamps: true,
    strict: 'throw'
  }
);

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;

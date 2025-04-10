const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minlength: [1, 'Content cannot be empty']
    },
    hashtags: [
      {
        type: String,
        lowercase: true
      }
    ],

    date: {
      type: Date,
      default: Date.now
    },
    edited: {
      type: Boolean,
      default: false
    },
    lastEdited: {
      type: Date,
      default: null
    },
    likesCount: {
      type: Number,
      default: 0
    },
    likedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
      }
    ],
    comments: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        content: {
          type: String,
          required: true,
          trim: true,
          minlength: [1, 'Comment content cannot be empty']
        },
        date: {
          type: Date,
          default: Date.now
        }
      }
    ],
    visibility: {
      type: String,
      enum: ['public', 'private', 'restricted'],
      default: 'public'
    },
    commentCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// postSchema.virtual('commentCount').get(function () {
//   return this.comments.length;
// });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;

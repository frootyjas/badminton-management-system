const mongoose = require('mongoose');
const Announcement = require('./Announcement');

// define the schema for Tournament
const tournamentSchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    reservationFee: {
      type: Number,
      required: false,
      default: null
    },
    eventFee: {
      type: Number,
      required: false,
      default: null
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    tournamentFee: {
      type: Number,
      default: null
    },
    tournamentCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
      }
    ],
    bracket: {
      type: [
        {
          category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true
          },
          rounds: [
            {
              roundNumber: Number,
              matchups: [
                {
                  participants: [
                    {
                      name: { type: String, required: true },
                      score: { type: Number, default: 0 },
                      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
                    }
                  ],
                  winner: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User'
                  }
                }
              ]
            }
          ]
        }
      ],
      default: []
    },
    results: {
      type: [
        {
          categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category'
          },
          scores: [
            {
              participantId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
              },
              score: Number,
              award: String
            }
          ]
        }
      ],
      default: []
    }
  },

  {
    timestamps: true,
    strict: 'throw'
  }
);

//tournament model, inheriting from Event
const Tournament = Announcement.discriminator('Tournament', tournamentSchema);

module.exports = Tournament;

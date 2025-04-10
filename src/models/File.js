const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accessibleBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  accessibleRoles: [{ type: String, enum: ['admin', 'player', 'coach', 'superadmin'] }],
  isPublic: { type: Boolean, default: false } // Indicates if the file is accessible by anyone
});

const File = mongoose.model('File', fileSchema);
module.exports = File;

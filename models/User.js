const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true },  // UUID
  name: { type: String, default: '' },
  email: { type: String, default: '' },
});

const User = mongoose.model('User', UserSchema);
module.exports = User;

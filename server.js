const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",  // Adjust to your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// MongoDB connection
const mongoURI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/${process.env.DB_NAME}?retryWrites=true&w=majority`;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Real-time socket communication
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // When a user joins the chat
  socket.on('join', async (userId) => {
    console.log(`User with UUID: ${userId} has joined`);

    // Fetch previous messages from the database when the user joins
    const previousMessages = await Message.find({ userId }).sort({ time: 1 });
    socket.emit('load_previous_messages', previousMessages); // Send previous messages to the user

    // Check if user exists, if not create a new user
    let user = await User.findOne({ userId });
    if (!user) {
      user = new User({ userId });
      await user.save();
    }
  });

  // Handle incoming messages (user to admin)
  socket.on('message', async (data) => {
    const { userId, message, sender } = data;

    // Save the message to the database
    const newMessage = new Message({ userId, message, sender });
    await newMessage.save();

    // Emit the message to the user and admin (real-time)
    io.to(userId).emit('new_message', newMessage);  // Send to user
    io.to('admin').emit('new_message', newMessage); // Send to admin
  });

  // Admin sends a message to the user
  socket.on('admin_message', async (data) => {
    const { userId, message } = data;

    // Save admin's response to the database
    const newMessage = new Message({ userId, message, sender: 'Admin' });
    await newMessage.save();

    // Emit the admin's response to the specific user
    io.to(userId).emit('new_message', newMessage); // Send to user
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in .env');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB successfully');
}

module.exports = connectDB;

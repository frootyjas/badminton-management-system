const mongoose = require('mongoose');
const { log, error } = console;

const connectDB = async (dbConfig) => {
  const maxRetries = 5;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(dbConfig.mongodb.uri, {
        user: dbConfig.mongodb.user,
        pass: dbConfig.mongodb.password,
        //tls: dbConfig.mongodb.tls,
        //tlsCAFile: dbConfig.mongodb.tlsCAFile
      });
      log('MongoDB connected successfully');

      // Log connection events
      mongoose.connection.on('error', (err) => {
        error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        log('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        log('MongoDB reconnected.');
      });

      return;
    } catch (err) {
      error(`MongoDB connection error on attempt ${attempt}:`, err.message);
      if (attempt < maxRetries) {
        log(`Retrying connection in ${retryDelay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      } else {
        log('Max connection attempts reached. Exiting...');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;

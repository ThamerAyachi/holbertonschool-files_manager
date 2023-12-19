const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    // Read database connection configuration from environment variables
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    // Build the MongoDB connection URL
    this.url = `mongodb://${host}:${port}/${database}`;

    // Create a MongoClient instance with unified topology
    this.client = new MongoClient(this.url, { useUnifiedTopology: true });

    // Connect to the MongoDB server
    this.client
      .connect()
      .then(() => {
        console.log('Connected to MongoDB');
      })
      .catch((err) => {
        console.error('Error connecting to MongoDB:', err);
      });
  }

  // Check if the MongoDB client is connected
  isAlive() {
    return this.client.isConnected();
  }

  // Get the number of users in the 'users' collection
  async nbUsers() {
    const db = this.client.db();
    const collection = db.collection('users');
    return collection.countDocuments();
  }

  // Get the number of files in the 'files' collection
  async nbFiles() {
    const db = this.client.db();
    const collection = db.collection('files');
    return collection.countDocuments();
  }
}

// Create a singleton instance of the MongoDB client
const dbClient = new DBClient();

// Export the MongoDB client instance
module.exports = dbClient;

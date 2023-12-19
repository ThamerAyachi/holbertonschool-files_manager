import { createClient } from 'redis';

class RedisClient {
  constructor() {
    // Create a Redis client instance
    this.client = createClient();

    // Set up error handling for the Redis client
    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  // Check if the Redis client is connected
  isAlive() {
    return this.client.connected;
  }

  // Get the value associated with a key from Redis
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, res) => {
        if (err) {
          // Handle the error if any
          reject(err);
        } else {
          // Resolve with the result
          resolve(res);
        }
      });
    });
  }

  // Set the value associated with a key in Redis with an optional expiration time
  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      // Use the 'EX' option to set an expiration time in seconds
      this.client.set(key, value, 'EX', duration, (err, res) => {
        if (err) {
          // Handle the error if any
          reject(err);
        } else {
          // Resolve with the result
          resolve(res);
        }
      });
    });
  }

  // Delete a key from Redis
  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err, res) => {
        if (err) {
          // Handle the error if any
          reject(err);
        } else {
          // Resolve with the result
          resolve(res);
        }
      });
    });
  }
}

// Create a singleton instance of the Redis client
const redisClient = new RedisClient();

// Export the Redis client instance
module.exports = redisClient;

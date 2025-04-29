import { MongoClient } from 'mongodb';

// Connection URL - get from environment variable or use default
const url = process.env.MONGO_URL || 'mongodb://localhost:27017/inseat';
const dbName = 'inseat';

// Create a new MongoClient
const client = new MongoClient(url);
let db = null;

// Connect to the MongoDB server
export const connectToDatabase = async () => {
  if (db) return db;
  
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    db = client.db(dbName);
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Close the connection
export const closeConnection = async () => {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
};

// Get reference to a collection
export const getCollection = async (collectionName) => {
  const db = await connectToDatabase();
  return db.collection(collectionName);
};

// Export the MongoDB client
export default client; 
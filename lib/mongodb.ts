import mongoose from 'mongoose';

// Default to using a local MongoDB instance for development if no URI is provided
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spendx';

// Disable mongoose debug mode to reduce terminal logging
mongoose.set('debug', false);

// Define mongoose cache interface
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add mongoose to global type
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

// Initialize mongoose cache
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };
    
    try {
      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        return mongoose;
      });
    } catch (error) {
      console.error('Failed to establish MongoDB connection:', error);
      cached.promise = null;
      throw error;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB connection error:', error);
    // In development, provide a MockDB
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using mock database for development');
      return {
        models: {
          // You can add mock models here if needed
        },
        model: () => {
          return {
            find: () => ({ sort: () => ({ limit: () => [] }) }),
            findOne: () => null,
            findById: () => null,
            findByIdAndDelete: () => null,
            save: async () => ({ _id: `mock-${Date.now()}` })
          };
        },
        createCollection: () => ({}),
      } as unknown as typeof mongoose;
    }
    throw error;
  }
  
  return cached.conn;
}

export default connectToDatabase; 
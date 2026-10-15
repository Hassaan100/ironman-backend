import mongoose from 'mongoose';

export const connectDB = async (retries = 0) => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ironman_gym';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database] MongoDB Connection Error:`, error.message);
    console.log(`[Database] ⚠️ Ensure MongoDB is running (e.g. run 'net start MongoDB' in an Admin terminal). Retrying in 5 seconds...`);
    setTimeout(() => connectDB(retries + 1), 5000);
  }
};

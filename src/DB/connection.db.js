import mongoose from "mongoose";
const connectDB = async () => {
  try {
    const uri = process.env.DB_URI;

    if (!uri) {
      throw new Error("DB_URI is missing");
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("DB connected successfuly");
    return mongoose.connection;
  } catch (error) {
    console.error("fail to connect on DB", error.message || error);
    throw error;
  }
};

export default connectDB;


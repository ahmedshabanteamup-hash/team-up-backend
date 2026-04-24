import mongoose from "mongoose";
const connectDB = async () => {
    try {
        const uri = process.env.DB_URI        
const result = await mongoose.connect( uri)
console.log("DB connected successfuly");

} catch (error) {
    console.log('fail to connect on DB' , error);
    
    }
}
export default connectDB;


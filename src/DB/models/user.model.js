import mongoose from "mongoose";

export const roleEnum = {
    admin: "admin", client: "client",
    developer: "developer", company: "company"
}
    
 export const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },

  password: { 
    type: String, 
    required: true 
    }, // hashed
  
  role: { 
    type: String, 
    enum: { values:Object.values(roleEnum)}, 
    required: true, 
    default:roleEnum.client
  },

  // account state
  isActive: { 
    type: Boolean, 
    default: true 
    },
   confirmEmail: Boolean,
  
}
    , {
    timestamps: true
});

    
export const userModel = mongoose.model("User", userSchema)
userModel.syncIndexes()
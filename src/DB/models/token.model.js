
import mongoose from "mongoose";

export const tokenTypeEnum = {
  refresh: "refresh",
  block: "block"
};

const tokenSchema = new mongoose.Schema({
  
  jti: {
    type: String,
    required: true,
    unique: true // مهم جداً، لأنه id للتوكن نفسه
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },

  type: {
    type: String,
    enum: Object.values(tokenTypeEnum),
    required: true
  },

  expiresAt: {
    type: Date,
    required: true
  }

}, {
  timestamps: true
});

tokenSchema.index({ jti: 1 });

export const tokenModel = mongoose.model("token", tokenSchema);

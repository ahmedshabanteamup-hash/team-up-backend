// DB/models/paymentMethod.model.js
import mongoose, { Schema } from "mongoose";

const paymentMethodSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
        },
      
    type: {
      type: String,
      enum: ["bank", "paypal"],
      required: true,
    },

    providerData: {
      type: Object, // paypalEmail OR bank data (masked)       
      required: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    deletedAt: Date,
  },
  { timestamps: true }
);

export const paymentMethodModel = mongoose.model(
  "PaymentMethod",
  paymentMethodSchema
);


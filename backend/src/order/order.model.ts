// FILE: services/api/src/order/order.model.ts
// Mongoose schema + model for orders.
// An order may contain multiple files (each with its own print settings).

import mongoose, { Schema, Document } from "mongoose";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "printing"
  | "completed"
  | "cancelled";

export type PaymentMode = "online" | "offline";

// One file entry within a multi-file order
export interface IOrderFile {
  fileName:      string;
  cloudinaryUrl: string;
  pages:         number;
  copies:        number;
  colour:        boolean;
  duplex:        boolean;
  orientation:   string;   // "portrait" | "landscape"
  pageRange:     string;   // "all" or "1-3,5"
  amount:        number;   // pre-calculated price for this file
}

export interface IOrder extends Document {
  orderId:           string;          // Short human-readable ID e.g. "ABC123"
  userName:          string;          // User's name for order segregation
  files:             IOrderFile[];    // ≥1 files in this order
  status:            OrderStatus;
  paymentMode:       PaymentMode;
  totalAmount:       number;
  razorpayOrderId?:  string;          // Only for online payments
  razorpayPaymentId?: string;
  createdAt:         Date;
  updatedAt:         Date;
}

const OrderFileSchema = new Schema<IOrderFile>(
  {
    fileName:      { type: String, required: true },
    cloudinaryUrl: { type: String, required: true },
    pages:         { type: Number, required: true, min: 1 },
    copies:        { type: Number, required: true, min: 1, max: 50 },
    colour:        { type: Boolean, default: false },
    duplex:        { type: Boolean, default: false },
    orientation:   { type: String, enum: ["portrait", "landscape"], default: "portrait" },
    pageRange:     { type: String, default: "all" },
    amount:        { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type:     String,
      required: true,
      unique:   true,
      uppercase: true,
      trim:     true,
    },
    userName: {
      type:     String,
      required: true,
      trim:     true,
    },
    files: {
      type:     [OrderFileSchema],
      required: true,
      validate: (v: IOrderFile[]) => v.length >= 1,
    },
    status: {
      type:    String,
      enum:    ["pending_payment", "paid", "printing", "completed", "cancelled"],
      default: "pending_payment",
    },
    paymentMode: {
      type:     String,
      enum:     ["online", "offline"],
      required: true,
    },
    totalAmount:        { type: Number, required: true },
    razorpayOrderId:    { type: String },
    razorpayPaymentId:  { type: String },
  },
  {
    timestamps: true, // auto-adds createdAt + updatedAt
  }
);

// Index for fast polling query: GET /orders?status=...
OrderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>("Order", OrderSchema);
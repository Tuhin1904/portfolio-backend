import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRequest extends Document {
  senderId: mongoose.Types.ObjectId;   // registered user (userRole: 2)
  receiverId: mongoose.Types.ObjectId; // admin (userRole: 1)
  status: 'pending' | 'accepted' | 'rejected';
}

const chatRequestSchema = new Schema<IChatRequest>(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

// Prevent duplicate pending requests between same pair
chatRequestSchema.index({ senderId: 1, receiverId: 1, status: 1 });

export const ChatRequest = mongoose.model<IChatRequest>('ChatRequest', chatRequestSchema);

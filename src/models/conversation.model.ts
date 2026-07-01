import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Types.ObjectId[]; // [userId, adminId]
  chatRequestId: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    chatRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatRequest',
      required: true,
    },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);

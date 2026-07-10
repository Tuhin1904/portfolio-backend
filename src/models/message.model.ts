import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  queryId: mongoose.Types.ObjectId;  // Links chat to a specific project inquiry
  senderId: mongoose.Types.ObjectId; // User who sent the message (Admin or Client)
  message: string;
  mediaUrl?: string;                  // Optional, for attachments
  createdAt: Date;
  readBy: mongoose.Types.ObjectId[]; // Users who have read this message
}

const MessageSchema = new Schema<IMessage>(
  {
    queryId: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectQuery',
      required: true,
      index: true
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true
    },
    mediaUrl: {
      type: String
    },
    readBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: []
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);

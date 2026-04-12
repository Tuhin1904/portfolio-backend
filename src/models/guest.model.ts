import mongoose, { Schema, Document } from 'mongoose';

export interface IGuest extends Document {
  name: string;
  email: string;
  workType: string;
  budget: string;
  message: string;
  typeOfUser: string;
  userId?: mongoose.Types.ObjectId;
  status: string;
}

const guestSchema = new Schema<IGuest>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
    },
    workType: {
      type: String,
      required: true,
    },
    budget: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    typeOfUser: {
      type: String,
      enum: ['guest', 'registered'],
      default: 'guest',
    },
    status: {
      type: String,
      enum: ['pending', 'rejected', 'accepted', 'working', 'cancelled', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

export const Guest = mongoose.model<IGuest>('Guest', guestSchema);

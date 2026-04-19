import mongoose from 'mongoose';
import { IUser } from '../types/user';

const userSchema = new mongoose.Schema<IUser>(
  {
    userName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      unique: true,
      required: true,
    },
    location: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    userRole: {
      type: Number,
      required: true,
    },
    profilePicUrl: {
      type: String,
      default: '',
    },
    refreshToken: { type: String },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);

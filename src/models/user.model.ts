import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
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
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);

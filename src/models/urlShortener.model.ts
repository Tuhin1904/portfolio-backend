import mongoose, { Schema } from 'mongoose';
import { IUrlShortener } from '../types/urlShortener';

const clickAnalyticsSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now },
    referrer: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    location: { type: String, default: 'Unknown' },
    country: { type: String, default: '' },
    city: { type: String, default: '' },
  },
  { _id: false },
);


const urlShortenerSchema = new Schema<IUrlShortener>(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    creatorEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
      index: true,
    },

    clicks: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    analytics: [clickAnalyticsSchema],
  },
  { timestamps: true },
);

export const UrlShortener = mongoose.model<IUrlShortener>('UrlShortener', urlShortenerSchema);

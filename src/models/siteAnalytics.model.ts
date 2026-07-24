import mongoose, { Schema } from 'mongoose';
import { ISiteAnalytics } from '../types/siteAnalytics';

const siteAnalyticsSchema = new Schema<ISiteAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: 'Guest',
      trim: true,
    },
    userEmail: {
      type: String,
      default: '',
      trim: true,
    },
    pageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    referrer: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    ip: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    country: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound index on sessionId and pageUrl for fast upserts/queries
siteAnalyticsSchema.index({ sessionId: 1, pageUrl: 1 });

export const SiteAnalytics = mongoose.model<ISiteAnalytics>('SiteAnalytics', siteAnalyticsSchema);

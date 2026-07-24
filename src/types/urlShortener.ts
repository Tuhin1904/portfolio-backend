import { Document, Types } from 'mongoose';

export interface IClickAnalytics {
  timestamp: Date;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  location?: string;
  country?: string;
  city?: string;
}

export interface IUrlShortener extends Document {
  originalUrl: string;
  shortCode: string;
  title?: string;
  createdBy?: Types.ObjectId;
  creatorEmail?: string;
  clicks: number;

  isActive: boolean;
  expiresAt?: Date;
  analytics: IClickAnalytics[];
  createdAt: Date;
  updatedAt: Date;
}

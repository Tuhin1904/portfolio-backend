import { Document, Types } from 'mongoose';

export interface IClickAnalytics {
  timestamp: Date;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}

export interface IUrlShortener extends Document {
  originalUrl: string;
  shortCode: string;
  title?: string;
  createdBy?: Types.ObjectId;
  clicks: number;
  isActive: boolean;
  expiresAt?: Date;
  analytics: IClickAnalytics[];
  createdAt: Date;
  updatedAt: Date;
}

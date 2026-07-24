import { Document, Types } from 'mongoose';

export interface ISiteAnalytics extends Document {
  userId?: Types.ObjectId;
  userName: string;
  userEmail?: string;
  pageUrl: string;
  referrer?: string;
  userAgent?: string;
  ip: string;
  location: string;
  country?: string;
  city?: string;
  durationSeconds: number;
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

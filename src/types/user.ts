import { Document } from 'mongoose';

export interface IUser extends Document {
  userName: string;
  email: string;
  phone: string;
  location?: string;
  password: string;
  userRole: number;
  profilePicUrl?: string;
  refreshToken?: string;
}

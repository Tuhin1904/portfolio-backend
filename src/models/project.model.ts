import mongoose, { Schema, Document } from 'mongoose';

export interface IMilestone {
  title: string;
  completed: boolean;
}

export interface IProject extends Document {
  workType: string;
  totalBudget: string;
  userId?: mongoose.Types.ObjectId;
  guestId: mongoose.Types.ObjectId;
  milestones: IMilestone[];
  progress: number; // percentage (0-100)
}

const milestoneSchema = new Schema<IMilestone>({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const projectSchema = new Schema<IProject>(
  {
    workType: { type: String, required: true },
    totalBudget: { type: String, required: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User' },
    guestId: { type: mongoose.Types.ObjectId, ref: 'Guest', required: true },

    milestones: [milestoneSchema],

    progress: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Project = mongoose.model<IProject>('Project', projectSchema);

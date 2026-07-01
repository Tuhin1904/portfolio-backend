import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  queryId: mongoose.Types.ObjectId;  // ref: ProjectQuery
  userId: mongoose.Types.ObjectId;   // who wrote the review
  rating: number;                    // 1–5
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    queryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectQuery',
      required: true,
      unique: true, // one review per completed project
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true },
);

// Fast lookup: all reviews for a user
reviewSchema.index({ userId: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);

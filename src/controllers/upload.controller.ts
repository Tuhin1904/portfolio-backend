import { Request, Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3 } from '../config/r2';

export const uploadImage = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const fileKey = `images/${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    const fileUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;

    res.status(200).json({
      success: true,
      url: fileUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: 'Upload failed',
    });
  }
};

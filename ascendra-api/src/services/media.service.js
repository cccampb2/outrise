import { Readable } from "stream";

import cloudinary from "../config/cloudinary.js";

export const uploadVerificationVideo = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "ascendra/verifications",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          type: "video",
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

export const deleteVerificationVideo = async (publicId) => {
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
  });
};

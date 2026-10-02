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

export const deleteProfileImage = async (publicId) => {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  // An already absent image also satisfies cleanup.
  if (result?.result !== "ok" && result?.result !== "not found") {
    throw new Error(
      `Failed to delete profile image ${publicId}: ${result?.result ?? "missing result"}`,
    );
  }
};

export function uploadProfileImageBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "ascendra/profile-images",
        resource_type: "image",

        transformation: [
          {
            width: 800,
            height: 800,
            crop: "fill",
            gravity: "auto",
          },
          {
            quality: "auto",
            fetch_format: "auto",
          },
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      },
    );

    uploadStream.end(buffer);
  });
}

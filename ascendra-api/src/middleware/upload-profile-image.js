import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    return callback(new Error("Profile image must be an image"));
  }

  callback(null, true);
};

export const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("profileImage");

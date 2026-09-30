import multer from "multer";
import BadRequestError from "../errors/BadRequestError.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, callback) => {
  if (!file.mimetype.startsWith("video/")) {
    return callback(new BadRequestError("Verification proof must be a video"));
  }

  callback(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter,
}).single("proof");

export const uploadVerificationProof = (req, res, next) => {
  upload(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (
      error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE"
    ) {
      next(new BadRequestError("Verification video must be 100 MB or smaller"));
      return;
    }

    if (error instanceof multer.MulterError) {
      next(new BadRequestError("Invalid verification video upload"));
      return;
    }

    next(error);
  });
};

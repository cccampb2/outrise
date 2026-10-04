import {
  createVerification,
  getUserVerificationById,
  getUserVerifications,
  getAdminVerifications,
  getAdminVerificationById,
  rejectVerification,
  approveVerification,
} from "../services/verification.service.js";
import BadRequestError from "../errors/BadRequestError.js";

export const createVerificationController = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new BadRequestError("Verification proof video is required");
    }
    const verification = await createVerification({
      userId: req.user.userId,
      exerciseId: req.body.exercise,
      performance: req.body.performance,
      proofFile: req.file,
      idempotencyKey: req.body.idempotencyKey,
    });

    return res.status(201).json({ verification });
  } catch (error) {
    next(error);
  }
};

export const getUserVerificationByIdController = async (req, res, next) => {
  try {
    const verification = await getUserVerificationById({
      userId: req.user.userId,
      verificationId: req.params.verificationId,
    });

    res.status(200).json({
      verification,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserVerificationsController = async (req, res, next) => {
  try {
    const result = await getUserVerifications({
      userId: req.user.userId,
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminVerificationsController = async (req, res, next) => {
  try {
    const result = await getAdminVerifications({
      status: req.query.status,
      page: req.query.page,
      limit: req.query.limit,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const getAdminVerificationByIdController = async (req, res, next) => {
  try {
    const verification = await getAdminVerificationById(
      req.params.verificationId,
    );

    res.status(200).json({
      verification,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectVerificationController = async (req, res, next) => {
  try {
    const verification = await rejectVerification({
      verificationId: req.params.verificationId,
      adminId: req.user.userId,
      rejectionReason: req.body.rejectionReason,
    });

    res.status(200).json({ verification });
  } catch (error) {
    next(error);
  }
};

export const approveVerificationController = async (req, res, next) => {
  try {
    const result = await approveVerification({
      verificationId: req.params.verificationId,
      adminId: req.user.userId,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

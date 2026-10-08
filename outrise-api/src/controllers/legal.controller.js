import { legalDocuments } from "../config/legal.js";
import { acceptLegalDocuments } from "../services/legal.service.js";
export const getLegalDocumentsController = (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json(legalDocuments);
};
export const acceptLegalDocumentsController = async (req, res, next) => {
  try {
    const legalAcceptance = await acceptLegalDocuments({
      userId: req.user.userId,
      ...req.body,
    });
    res.status(200).json({ legalAcceptance });
  } catch (error) {
    next(error);
  }
};

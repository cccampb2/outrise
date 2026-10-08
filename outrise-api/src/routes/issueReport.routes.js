import express from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { limitIssueReports } from "../middleware/issueReportRateLimit.js";
import {
  createIssueReportSchema,
  reportMessageSchema,
} from "../middleware/validators/issueReport.validators.js";
import {
  createIssueReportController,
  reportMessageController,
} from "../controllers/issueReport.controller.js";

const router = express.Router();
router.post(
  "/messages/:messageId",
  authenticate,
  validate(reportMessageSchema),
  limitIssueReports,
  reportMessageController,
);
// Account restrictions must never prevent submitting an issue report.
router.post(
  "/",
  validate(createIssueReportSchema),
  limitIssueReports,
  createIssueReportController,
);
export default router;

import express from "express";
import { validate } from "../middleware/validate.js";
import { limitIssueReports } from "../middleware/issueReportRateLimit.js";
import { createIssueReportSchema } from "../middleware/validators/issueReport.validators.js";
import { createIssueReportController } from "../controllers/issueReport.controller.js";

const router = express.Router();
// Account restrictions must never prevent submitting an issue report.
router.post("/", validate(createIssueReportSchema), limitIssueReports, createIssueReportController);
export default router;

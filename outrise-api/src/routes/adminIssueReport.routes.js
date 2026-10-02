import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import { issueReportListSchema, issueReportIdSchema, updateIssueReportSchema } from "../middleware/validators/issueReport.validators.js";
import { listIssueReportsController, getIssueReportController, updateIssueReportController } from "../controllers/issueReport.controller.js";

const router = express.Router();
router.use(authenticate, requireRole("admin"));
router.get("/", validate(issueReportListSchema), listIssueReportsController);
router.get("/:reportId", validate(issueReportIdSchema), getIssueReportController);
router.patch("/:reportId", validate(updateIssueReportSchema), updateIssueReportController);
export default router;

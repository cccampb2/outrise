import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireFaction } from "../middleware/requireFaction.js";
import {
  getCurrentPersonalRecordHistoryController,
  getCurrentPersonalRecordsController,
} from "../controllers/personalRecord.controller.js";
import { validate } from "../middleware/validate.js";
import { personalRecordHistorySchema } from "../middleware/validators/personalRecord.validators.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  requireFaction,
  getCurrentPersonalRecordsController,
);

router.get(
  "/:exerciseId",
  authenticate,
  requireFaction,
  validate(personalRecordHistorySchema),
  getCurrentPersonalRecordHistoryController,
);
export default router;

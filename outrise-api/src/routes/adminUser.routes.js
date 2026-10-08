import express from "express";
import { authenticate } from "../middleware/auth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  adminUserListSchema,
  adminUserIdSchema,
  adminUserStatusSchema,
  adminUserRoleSchema,
  clearAgeRejectionSchema,
} from "../middleware/validators/adminUser.validators.js";
import {
  listAdminUsersController,
  getAdminUserController,
  setUserAccountStatusController,
  setUserRoleController,
  clearAgeRejectionController,
} from "../controllers/adminUser.controller.js";

const router = express.Router();
router.use(authenticate, requireRole("admin"));
router.get("/", validate(adminUserListSchema), listAdminUsersController);
router.get("/:userId", validate(adminUserIdSchema), getAdminUserController);
router.patch(
  "/:userId/status",
  validate(adminUserStatusSchema),
  setUserAccountStatusController,
);
router.patch(
  "/:userId/role",
  requireRole("owner"),
  validate(adminUserRoleSchema),
  setUserRoleController,
  clearAgeRejectionController,
);
router.post(
  "/:userId/age-eligibility/reset",
  requireRole("owner"),
  validate(clearAgeRejectionSchema),
  clearAgeRejectionController,
);
export default router;

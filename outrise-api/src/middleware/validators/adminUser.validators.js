import { Joi } from "celebrate";
import { ACCOUNT_STATUSES } from "../../constants/accountStatus.js";
import { USER_ROLES } from "../../constants/userRoles.js";

const params = Joi.object({ userId: Joi.string().hex().length(24).required() });
export const adminUserListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().trim().max(100),
    status: Joi.string().valid("all", ...ACCOUNT_STATUSES).default("all"),
  }),
};
export const adminUserIdSchema = { params };
export const adminUserStatusSchema = {
  params,
  body: Joi.object({
    status: Joi.string().valid(...ACCOUNT_STATUSES).required(),
    reason: Joi.string().trim().min(1).max(1000).required(),
    suspensionDays: Joi.when("status", {
      is: "suspended",
      then: Joi.number().integer().min(1).max(365).default(7),
      otherwise: Joi.forbidden(),
    }),
  }),
};

export const adminUserRoleSchema = {
  params,
  body: Joi.object({
    role: Joi.string().valid("user", "admin").required(),
    expectedRole: Joi.string().valid(...USER_ROLES).required(),
    reason: Joi.string().trim().min(1).max(1000).required(),
  }),
};

import { Joi } from "celebrate";
import { ISSUE_REPORT_STATUSES } from "../../models/IssueReport.js";

const params = Joi.object({ reportId: Joi.string().hex().length(24).required() });
export const createIssueReportSchema = {
  body: Joi.object({
    email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).required(),
    subject: Joi.string().trim().min(3).max(120).required(),
    message: Joi.string().trim().min(10).max(3000).required(),
  }),
};
export const issueReportListSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    search: Joi.string().trim().max(100),
    status: Joi.string().valid("all", ...ISSUE_REPORT_STATUSES).default("open"),
  }),
};
export const issueReportIdSchema = { params };
export const updateIssueReportSchema = {
  params,
  body: Joi.object({
    status: Joi.string().valid(...ISSUE_REPORT_STATUSES).required(),
    expectedRevision: Joi.number().integer().min(0).required(),
    note: Joi.string().trim().allow("").max(2000).default(""),
  }),
};

export const sendIssueReportReplySchema = {
  params,
  body: Joi.object({
    subject: Joi.string().trim().min(1).max(120).pattern(/^[^\r\n]+$/).required(),
    message: Joi.string().trim().min(1).max(2000).required(),
    expectedRevision: Joi.number().integer().min(0).required(),
  }),
};
export const retryIssueReportReplySchema = {
  params: Joi.object({
    reportId: Joi.string().hex().length(24).required(),
    replyId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object({}),
};

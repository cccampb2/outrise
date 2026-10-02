import IssueReport, { ISSUE_REPORT_STATUSES } from "../models/IssueReport.js";
import User from "../models/User.js";
import BadRequestError from "../errors/BadRequestError.js";
import ConflictError from "../errors/ConflictError.js";
import NotFoundError from "../errors/NotFoundError.js";

function populateAdmins(query) {
  return query
    .populate("reviewer resolvedBy", "username")
    .populate("history.admin", "username");
}

export async function createIssueReport({ email, subject, message }) {
  // Public submissions cannot set status, reviewers, or internal notes.
  const report = await IssueReport.create({ email, subject, message });
  return report;
}

export async function listIssueReports({
  page = 1,
  limit = 20,
  search = "",
  status = "open",
}) {
  const filter = {};
  if (status !== "all") filter.status = status;
  if (search) {
    const pattern = {
      $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      $options: "i",
    };
    filter.$or = [{ email: pattern }, { subject: pattern }];
  }
  const [reports, total] = await Promise.all([
    IssueReport.find(filter)
      .select("-history")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("reviewer resolvedBy", "username")
      .lean(),
    IssueReport.countDocuments(filter),
  ]);
  return {
    reports,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getIssueReport(reportId) {
  const report = await populateAdmins(IssueReport.findById(reportId)).lean();
  if (!report) throw new NotFoundError("Issue report not found");
  // A supplied email is an unverified claim, not proof of account ownership.
  const account = await User.findOne({ email: report.email })
    .select("username accountStatus suspendedUntil")
    .lean();
  return { report, account };
}

export async function updateIssueReport({
  reportId,
  adminId,
  status,
  expectedRevision,
  note = "",
}) {
  if (
    !ISSUE_REPORT_STATUSES.includes(status) ||
    !Number.isInteger(expectedRevision) ||
    expectedRevision < 0 ||
    typeof note !== "string" ||
    note.trim().length > 2000
  ) {
    throw new BadRequestError(
      "Choose a valid report status and a note of up to 2,000 characters",
    );
  }
  const current = await IssueReport.findById(reportId)
    .select("status reviewer revision")
    .lean();
  if (!current) throw new NotFoundError("Issue report not found");
  const conflictMessage =
    "Another administrator updated this report. Refresh it before saving your changes.";
  if (current.revision !== expectedRevision)
    throw new ConflictError(conflictMessage);
  if (current.status === status && !note.trim())
    throw new BadRequestError("Change the status or add an internal note");
  const now = new Date();
  const update = {
    status,
    reviewer: status === "open" ? null : (current.reviewer ?? adminId),
    resolvedBy:
      status === "resolved"
        ? current.status === "resolved"
          ? undefined
          : adminId
        : null,
    resolvedAt:
      status === "resolved"
        ? current.status === "resolved"
          ? undefined
          : now
        : null,
  };
  // Note-only edits preserve who resolved the report and when.
  if (update.resolvedBy === undefined) delete update.resolvedBy;
  if (update.resolvedAt === undefined) delete update.resolvedAt;
  const report = await populateAdmins(
    IssueReport.findOneAndUpdate(
      { _id: reportId, revision: expectedRevision },
      {
        $set: update,
        $inc: { revision: 1 },
        $push: {
          history: {
            admin: adminId,
            previousStatus: current.status,
            status,
            note: note.trim(),
            createdAt: now,
          },
        },
      },
      { returnDocument: "after", runValidators: true },
    ),
  ).lean();
  if (!report) throw new ConflictError(conflictMessage);
  return report;
}

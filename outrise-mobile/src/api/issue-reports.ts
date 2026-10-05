import { apiRequest } from "./client";
import type { AccountStatus } from "./users";

export const issueReportStatuses = ["open", "in_review", "resolved"] as const;
export type IssueReportStatus = (typeof issueReportStatuses)[number];
type ReportAdmin = { _id: string; username: string } | null;
export type IssueReportReply = {
  _id: string;
  admin: ReportAdmin;
  to: string;
  subject: string;
  message: string;
  status: "pending" | "sent" | "failed";
  error: string;
  createdAt: string;
  sentAt: string | null;
};
export type IssueReportReplyInput = {
  subject: string;
  message: string;
  expectedRevision: number;
};
export type IssueReport = {
  _id: string;
  email: string;
  reportedUser?: string | null;
  subject: string;
  message: string;
  status: IssueReportStatus;
  reviewer: ReportAdmin;
  resolvedBy: ReportAdmin;
  resolvedAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export type IssueReportDetail = {
  report: IssueReport & {
    replies?: IssueReportReply[];
    history: {
      _id: string;
      admin: ReportAdmin;
      previousStatus: IssueReportStatus;
      status: IssueReportStatus;
      note: string;
      createdAt: string;
    }[];
  };
  account: {
    _id: string;
    username: string;
    accountStatus: AccountStatus;
    suspendedUntil: string | null;
  } | null;
  reportedAccount?: {
    _id: string;
    username: string;
    accountStatus: AccountStatus;
    suspendedUntil: string | null;
  } | null;
};
export type IssueReportUpdate = {
  status: IssueReportStatus;
  expectedRevision: number;
  note?: string;
};

export async function submitIssueReport(data: {
  email: string;
  subject: string;
  message: string;
  reportedUserId?: string;
}): Promise<{ message: string }> {
  const response = await apiRequest("/issue-reports", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function getIssueReports(
  page = 1,
  search = "",
  status = "open",
): Promise<{
  reports: IssueReport[];
  pagination: { page: number; totalPages: number; total: number };
}> {
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    status,
  });
  if (search) params.set("search", search);
  const response = await apiRequest(`/admin/issue-reports?${params}`);
  return response.json();
}

export async function getIssueReport(
  reportId: string,
): Promise<IssueReportDetail> {
  const response = await apiRequest(`/admin/issue-reports/${reportId}`);
  return response.json();
}

export async function updateIssueReport(
  reportId: string,
  data: IssueReportUpdate,
): Promise<{ report: IssueReportDetail["report"] }> {
  const response = await apiRequest(`/admin/issue-reports/${reportId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function sendIssueReportReply(
  reportId: string,
  data: IssueReportReplyInput,
): Promise<{ report: IssueReportDetail["report"] }> {
  const response = await apiRequest(
    `/admin/issue-reports/${reportId}/replies`,
    { method: "POST", body: JSON.stringify(data) },
  );
  return response.json();
}

export async function retryIssueReportReply(
  reportId: string,
  replyId: string,
): Promise<{ report: IssueReportDetail["report"] }> {
  const response = await apiRequest(
    `/admin/issue-reports/${reportId}/replies/${replyId}/retry`,
    { method: "POST", body: JSON.stringify({}) },
  );
  return response.json();
}

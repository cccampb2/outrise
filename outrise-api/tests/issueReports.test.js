import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import IssueReport from "../src/models/IssueReport.js";
import User from "../src/models/User.js";
import { createIssueReport, listIssueReports, getIssueReport, updateIssueReport } from "../src/services/issueReport.service.js";
import { createIssueReportController } from "../src/controllers/issueReport.controller.js";
import { createIssueReportSchema, updateIssueReportSchema, issueReportListSchema } from "../src/middleware/validators/issueReport.validators.js";
import { createIssueReportLimiter } from "../src/middleware/issueReportRateLimit.js";
import publicRoutes from "../src/routes/issueReport.routes.js";
import adminRoutes from "../src/routes/adminIssueReport.routes.js";
import { authenticate } from "../src/middleware/auth.js";
import { requireRole } from "../src/middleware/requireRole.js";

const id = () => new mongoose.Types.ObjectId();
const reportId = id(), firstAdmin = id(), secondAdmin = id();
const query = (value) => ({
  select() { return this; }, sort() { return this; }, skip() { return this; },
  limit() { return this; }, populate() { return this; }, lean: async () => value,
});

test("public reports normalize email and reject missing, oversized or injected admin fields", async () => {
  const valid = { email: "  Tester@Example.com ", subject: "Account access", message: "My suspension appears to be a mistake." };
  const result = createIssueReportSchema.body.validate(valid);
  assert.equal(result.error, undefined);
  assert.equal(result.value.email, "tester@example.com");
  for (const data of [
    { ...valid, email: "invalid" }, { ...valid, message: "short" },
    { ...valid, message: "a".repeat(3001) }, { ...valid, subject: "a".repeat(121) },
    { ...valid, status: "resolved" }, { ...valid, reviewer: firstAdmin.toString() },
    { ...valid, history: [{ note: "Injected" }] },
  ]) assert.ok(createIssueReportSchema.body.validate(data).error);
  const report = new IssueReport(result.value);
  await report.validate();
  assert.equal(report.status, "open");
  assert.equal(report.reviewer, null);
  assert.equal(report.revision, 0);
  assert.equal(report.history.length, 0);
});

test("submission accepts signed-out or restricted users and reveals no account status or internal data", async (t) => {
  const data = { email: "tester@example.com", subject: "Account access", message: "Please review my suspension." };
  t.mock.method(User, "findOne", () => assert.fail("Public submission must not look up or disclose account ownership"));
  t.mock.method(IssueReport, "create", async (document) => {
    assert.deepEqual(document, data);
    return { ...document, _id: reportId, history: [{ note: "Private" }] };
  });
  await createIssueReport({ ...data, status: "resolved", reviewer: firstAdmin });
  let payload;
  const res = { status(code) { assert.equal(code, 201); return this; }, json(value) { payload = value; } };
  await createIssueReportController({ body: data }, res, (error) => { throw error; });
  assert.deepEqual(Object.keys(payload), ["message"]);
  assert.ok(!JSON.stringify(payload).includes("Private"));
  const publicPost = publicRoutes.stack[0].route;
  assert.ok(publicPost.methods.post);
  assert.ok(publicPost.stack.every((layer) => layer.handle !== authenticate));
  assert.equal(publicRoutes.stack.length, 1);
});

test("all admin inbox routes require authentication and an admin role", () => {
  assert.equal(adminRoutes.stack[0].handle, authenticate);
  let error;
  adminRoutes.stack[1].handle({ user: { role: "user" } }, {}, (value) => { error = value; });
  assert.equal(error.statusCode, 403);
  let permitted = false;
  requireRole("admin")({ user: { role: "admin" } }, {}, (value) => { assert.equal(value, undefined); permitted = true; });
  assert.ok(permitted);
});

test("inbox is shared, paginates by status, and searches literal email or subject text", async (t) => {
  let filter;
  t.mock.method(IssueReport, "find", (value) => {
    filter = value;
    const result = query([{ _id: reportId }]);
    result.select = (fields) => { assert.equal(fields, "-history -replies"); return result; };
    result.skip = (count) => { assert.equal(count, 20); return result; };
    result.limit = (count) => { assert.equal(count, 20); return result; };
    return result;
  });
  t.mock.method(IssueReport, "countDocuments", async () => 21);
  const result = await listIssueReports({ page: 2, status: "in_review", search: "test@example.com" });
  assert.equal(result.pagination.totalPages, 2);
  assert.equal(filter.status, "in_review");
  assert.equal(filter.$or[0].email.$regex, "test@example\\.com");
  assert.ok(!("reviewer" in filter));
  assert.equal(issueReportListSchema.query.validate({}).value.status, "open");
});

test("report details can match a restricted account without treating email as verified ownership", async (t) => {
  t.mock.method(IssueReport, "findById", () => query({ _id: reportId, email: "tester@example.com", history: [] }));
  t.mock.method(User, "findOne", (filter) => {
    assert.equal(filter.email, "tester@example.com");
    const result = query({ _id: id(), username: "Tester", accountStatus: "banned" });
    result.select = (fields) => { assert.ok(!fields.includes("password")); assert.ok(!fields.includes("moderationReason")); return result; };
    return result;
  });
  assert.equal((await getIssueReport(reportId)).account.accountStatus, "banned");
  t.mock.method(User, "findOne", () => query(null));
  assert.equal((await getIssueReport(reportId)).account, null);
});

test("review, resolution, note-only changes and reopen keep a shared internal admin history", async (t) => {
  const current = { _id: reportId, status: "open", reviewer: null, resolvedBy: null, resolvedAt: null, revision: 0, history: [] };
  t.mock.method(IssueReport, "findById", () => query({ ...current }));
  t.mock.method(IssueReport, "findOneAndUpdate", (filter, update, options) => {
    assert.equal(filter._id, reportId);
    assert.equal(filter.revision, current.revision);
    assert.equal(options.runValidators, true);
    assert.equal(options.returnDocument, "after");
    Object.assign(current, update.$set);
    current.revision += update.$inc.revision;
    current.history.push(update.$push.history);
    return query({ ...current });
  });
  const save = (adminId, status, note = "") => updateIssueReport({ reportId, adminId, status, expectedRevision: current.revision, note });
  await save(firstAdmin, "in_review", "Checking the moderation history.");
  assert.equal(current.reviewer, firstAdmin);
  await save(secondAdmin, "in_review", "I found the original account.");
  assert.equal(current.reviewer, firstAdmin);
  await save(secondAdmin, "resolved", "Restriction corrected by admin.");
  assert.equal(current.resolvedBy, secondAdmin);
  const resolvedAt = current.resolvedAt;
  await save(firstAdmin, "resolved", "Reviewed the correction.");
  assert.equal(current.resolvedBy, secondAdmin);
  assert.equal(current.resolvedAt, resolvedAt);
  await save(firstAdmin, "open", "Needs another review.");
  assert.equal(current.resolvedBy, null);
  assert.equal(current.resolvedAt, null);
  assert.equal(current.reviewer, null);
  assert.equal(current.history.length, 5);
  assert.equal(current.history[1].admin, secondAdmin);
  assert.equal(current.history[4].previousStatus, "resolved");
});

test("stale admin edits cannot overwrite a newer status or note", async (t) => {
  t.mock.method(IssueReport, "findById", () => query({ _id: reportId, status: "in_review", reviewer: firstAdmin, revision: 2 }));
  const data = { reportId, adminId: secondAdmin, status: "resolved", note: "Done", expectedRevision: 1 };
  await assert.rejects(() => updateIssueReport(data), (error) => error.statusCode === 409);
  t.mock.method(IssueReport, "findOneAndUpdate", () => query(null));
  await assert.rejects(() => updateIssueReport({ ...data, expectedRevision: 2 }), (error) => error.statusCode === 409);
  assert.ok(updateIssueReportSchema.body.validate({ status: "resolved" }).error);
  assert.ok(updateIssueReportSchema.body.validate({ status: "resolved", expectedRevision: 1, adminId: firstAdmin.toString() }).error);
  assert.ok(updateIssueReportSchema.body.validate({ status: "resolved", expectedRevision: -1 }).error);
});

test("public report limiter limits repeated submissions and permits retry after expiry", () => {
  let now = 0;
  const limit = createIssueReportLimiter({ max: 2, windowMs: 10000, now: () => now });
  let accepted = 0;
  let rejected = 0;
  const res = {
    set(name, value) { assert.equal(name, "Retry-After"); assert.equal(value, "10"); return this; },
    status(code) { assert.equal(code, 429); return this; },
    json() { rejected++; },
  };
  const request = () => limit({ ip: "test-client" }, res, () => accepted++);
  request(); request(); request();
  assert.equal(accepted, 2);
  assert.equal(rejected, 1);
  now = 10000;
  request();
  assert.equal(accepted, 3);
});

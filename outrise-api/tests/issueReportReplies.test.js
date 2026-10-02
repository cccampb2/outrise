import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import IssueReport from "../src/models/IssueReport.js";
import User from "../src/models/User.js";
import { getSupportEmailConfig, supportEmailVariables } from "../src/services/email.service.js";
import { sendIssueReportReply, retryIssueReportReply } from "../src/services/issueReportReply.service.js";
import { sendIssueReportReplySchema, retryIssueReportReplySchema } from "../src/middleware/validators/issueReport.validators.js";
import adminRoutes from "../src/routes/adminIssueReport.routes.js";

const id = () => new mongoose.Types.ObjectId();
const reportId = id(), adminId = id();
const request = { reportId, adminId, expectedRevision: 0, subject: "Account update", message: "Thanks for reaching out. Your report has been reviewed." };
const query = (value) => ({ populate() { return this; }, select() { return this; }, lean: async () => typeof value === "function" ? value() : value });

function setup(t) {
  const original = Object.fromEntries(["RESEND_API_KEY", "EMAIL_FROM", "RESEND_SUPPORT_TEMPLATE"].map((name) => [name, process.env[name]]));
  process.env.RESEND_API_KEY = "test-only-key";
  delete process.env.EMAIL_FROM;
  delete process.env.RESEND_SUPPORT_TEMPLATE;
  t.after(() => { for (const [name, value] of Object.entries(original)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
  const state = { _id: reportId, email: "reporter@example.com", revision: 0, status: "open", history: [{ note: "Private admin information" }], replies: [] };
  t.mock.method(IssueReport, "findById", () => query(() => ({ ...state, replies: state.replies.map((reply) => ({ ...reply })) })));
  t.mock.method(User, "findOne", () => query({ firstName: "Caleb", username: "tester" }));
  const updates = [];
  const updateMock = t.mock.method(IssueReport, "updateOne", async (filter, update, options) => {
    assert.equal(options.runValidators, true);
    updates.push({ filter, update });
    if (filter.revision !== undefined && filter.revision !== state.revision) return { modifiedCount: 0 };
    let reply;
    if (filter.replies) {
      const match = filter.replies.$elemMatch;
      reply = state.replies.find((item) => String(item._id) === String(match._id));
      if (!reply) return { modifiedCount: 0 };
      if (match.attemptId && String(match.attemptId) !== String(reply.attemptId)) return { modifiedCount: 0 };
      if (match.status && reply.status !== match.status) return { modifiedCount: 0 };
      if (match.$or && !(reply.status === "failed" || (reply.status === "pending" && new Date(reply.lastAttemptAt) <= match.$or[1].lastAttemptAt.$lte))) return { modifiedCount: 0 };
    }
    if (update.$push) state.replies.push({ ...update.$push.replies });
    for (const [path, value] of Object.entries(update.$set ?? {})) reply[path.replace("replies.$.", "")] = value;
    state.revision += update.$inc?.revision ?? 0;
    return { modifiedCount: 1 };
  });
  const deliveries = [];
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options.headers.Authorization, "Bearer test-only-key");
    assert.equal(options.method, "POST");
    assert.equal(state.replies.length, 1, "Persist the attempt before contacting the provider");
    assert.equal(state.replies[0].status, "pending");
    deliveries.push({ options, body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => ({ id: "provider-email-id" }) };
  });
  return { state, updates, deliveries, updateMock, fetchMock };
}

test("reply validators accept plain-text responses and prevent recipient or template injection", () => {
  assert.equal(sendIssueReportReplySchema.body.validate(request).error?.details[0].path[0], "reportId");
  const valid = { subject: request.subject, message: request.message, expectedRevision: 0 };
  assert.equal(sendIssueReportReplySchema.body.validate(valid).error, undefined);
  for (const change of [{ to: "attacker@example.com" }, { adminId: String(adminId) }, { templateId: "other" }, { note: "Internal" }, { expectedRevision: -1 }, { subject: "Header\nInjection" }, { message: " " }, { message: "a".repeat(2001) }]) {
    assert.ok(sendIssueReportReplySchema.body.validate({ ...valid, ...change }).error);
  }
  assert.ok(retryIssueReportReplySchema.params.validate({ reportId: String(reportId), replyId: "invalid" }).error);
  const paths = adminRoutes.stack.filter((entry) => entry.route?.methods.post).map((entry) => entry.route.path);
  assert.deepEqual(paths, ["/:reportId/replies", "/:reportId/replies/:replyId/retry"]);
});

test("support-update supplies only escaped name, heading and response to the configured recipient", async (t) => {
  const { state, deliveries } = setup(t);
  t.mock.method(User, "findOne", (filter) => { assert.deepEqual(filter, { email: state.email }); return query({ firstName: '<img src="x">' }); });
  const data = { ...request, subject: "You & Outrise", message: '<script>unsafe</script>\nNext line' };
  const result = await sendIssueReportReply(data);
  assert.equal(result.status, "open", "Sending must not resolve the report");
  assert.equal(result.replies[0].status, "sent");
  assert.equal(result.replies[0].admin, adminId);
  assert.equal(result.replies[0].providerId, "provider-email-id");
  assert.ok(result.replies[0].sentAt instanceof Date);
  assert.deepEqual(deliveries[0].body, {
    from: "Outrise Support <support@outrisefitness.com>", to: [state.email], subject: data.subject,
    template: { id: "support-update", variables: { RECIPIENT_NAME: "&lt;img src=&quot;x&quot;&gt;", SUBJECT: "You &amp; Outrise", MESSAGE: "&lt;script&gt;unsafe&lt;/script&gt;<br>Next line" } },
  });
  assert.ok(!JSON.stringify(deliveries[0].body).includes("Private admin information"));
  assert.equal(deliveries[0].options.headers["Idempotency-Key"], state.replies[0].idempotencyKey);
  await sendIssueReportReply(data);
  await retryIssueReportReply({ reportId, replyId: state.replies[0]._id });
  assert.equal(deliveries.length, 1, "Repeated requests for a recorded sent reply never resend");
  await assert.rejects(() => sendIssueReportReply({ ...data, message: "Changed response" }), (error) => error.statusCode === 409);
});

test("anonymous reporters receive a generic greeting and no inferred account data", async (t) => {
  const { deliveries } = setup(t);
  t.mock.method(User, "findOne", () => query(null));
  await sendIssueReportReply(request);
  assert.equal(deliveries[0].body.template.variables.RECIPIENT_NAME, "there");
});

test("missing configuration, stale revisions and concurrent claims cannot send email", async (t) => {
  const { state, deliveries, updateMock } = setup(t);
  delete process.env.RESEND_API_KEY;
  await assert.rejects(() => sendIssueReportReply(request), (error) => error.statusCode === 503);
  assert.equal(state.replies.length, 0);
  process.env.RESEND_API_KEY = "test-only-key";
  state.revision = 1;
  await assert.rejects(() => sendIssueReportReply(request), (error) => error.statusCode === 409);
  state.revision = 0;
  updateMock.mock.mockImplementation(async () => ({ modifiedCount: 0 }));
  await assert.rejects(() => sendIssueReportReply(request), (error) => error.statusCode === 409);
  assert.equal(deliveries.length, 0);
});

test("template variable lengths are checked after escaping, before recording or sending", async (t) => {
  const { state, deliveries } = setup(t);
  await assert.rejects(() => sendIssueReportReply({ ...request, message: "<".repeat(501) }), (error) => error.statusCode === 400);
  assert.equal(state.replies.length, 0);
  assert.equal(deliveries.length, 0);
  assert.throws(() => supportEmailVariables({ recipientName: "Caleb", subject: "Update", message: "a".repeat(2001) }), (error) => error.statusCode === 400);
});

test("provider failures retain replies and retries reuse the exact payload even after config changes", async (t) => {
  const { state, deliveries, fetchMock } = setup(t);
  let fail = true;
  fetchMock.mock.mockImplementation(async (url, options) => {
    deliveries.push({ options, body: JSON.parse(options.body) });
    return fail ? { ok: false, status: 403, json: async () => ({ name: "validation_error", message: "Provider response with secret content" }) } : { ok: true, status: 200, json: async () => ({ id: "provider-email-id" }) };
  });
  await assert.rejects(() => sendIssueReportReply(request), (error) => error.statusCode === 502 && !error.message.includes("secret content"));
  assert.equal(state.replies[0].status, "failed");
  assert.ok(state.replies[0].error);
  process.env.EMAIL_FROM = "Changed sender <other@example.com>";
  process.env.RESEND_SUPPORT_TEMPLATE = "other-template";
  t.mock.method(User, "findOne", () => assert.fail("Retry must use the saved recipient name"));
  fail = false;
  await retryIssueReportReply({ reportId, replyId: state.replies[0]._id });
  assert.equal(state.replies[0].status, "sent");
  assert.equal(state.replies[0].error, "");
  assert.deepEqual(deliveries[0].body, deliveries[1].body);
  assert.equal(deliveries[0].options.headers["Idempotency-Key"], deliveries[1].options.headers["Idempotency-Key"]);
});

test("network timeouts are safe to retry, and active or expired attempts cannot resend", async (t) => {
  const { state, deliveries, fetchMock } = setup(t);
  fetchMock.mock.mockImplementation(async () => { throw new Error("Connection lost with sensitive details"); });
  await assert.rejects(() => sendIssueReportReply(request), (error) => error.statusCode === 502 && !error.message.includes("sensitive details"));
  const reply = state.replies[0];
  assert.equal(reply.status, "failed");
  reply.status = "pending";
  await assert.rejects(() => retryIssueReportReply({ reportId, replyId: reply._id }), (error) => error.statusCode === 409);
  reply.status = "failed";
  reply.createdAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await assert.rejects(() => retryIssueReportReply({ reportId, replyId: reply._id }), (error) => error.statusCode === 409 && error.message.includes("expired"));
  assert.equal(deliveries.length, 0);
});

test("database failure after provider acceptance can recover with the original email key", async (t) => {
  const { state, deliveries, updateMock } = setup(t);
  // The mock's initial implementation performs our in-memory journal updates.
  const apply = async (filter, update, options) => {
    if (update.$push) {
      state.replies.push({ ...update.$push.replies });
      state.revision++;
      return { modifiedCount: 1 };
    }
    const reply = state.replies[0];
    for (const [key, value] of Object.entries(update.$set ?? {})) reply[key.replace("replies.$.", "")] = value;
    state.revision++;
    return { modifiedCount: 1 };
  };
  let databaseFailed = false;
  updateMock.mock.mockImplementation(async (filter, update, options) => {
    if (update.$set?.["replies.$.status"] === "sent" && !databaseFailed) { databaseFailed = true; throw new Error("Database disconnected"); }
    return apply(filter, update, options);
  });
  await assert.rejects(() => sendIssueReportReply(request), /Database disconnected/);
  assert.equal(state.replies[0].status, "pending");
  state.replies[0].lastAttemptAt = new Date(Date.now() - 60000);
  await retryIssueReportReply({ reportId, replyId: state.replies[0]._id });
  assert.equal(state.replies[0].status, "sent");
  assert.deepEqual(deliveries[0].body, deliveries[1].body);
  assert.equal(deliveries[0].options.headers["Idempotency-Key"], deliveries[1].options.headers["Idempotency-Key"]);
});

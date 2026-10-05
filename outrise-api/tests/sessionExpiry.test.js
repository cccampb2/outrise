import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../src/models/User.js";
import {
  authenticate,
  authenticateUnverified,
} from "../src/middleware/auth.js";

test("expired and invalid JWTs signal the mobile session guard before querying an account", async (t) => {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-session-expiry-secret";
  t.after(() => {
    if (previous === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous;
  });
  t.mock.method(User, "findById", () => {
    assert.fail("Invalid tokens must not query users");
  });
  const tokens = [
    jwt.sign({ userId: "test" }, process.env.JWT_SECRET, { expiresIn: -1 }),
    "invalid-token",
    jwt.sign({ userId: "test" }, "different-secret"),
  ];
  for (const middleware of [authenticate, authenticateUnverified]) {
    for (const token of tokens) {
      let error;
      await middleware(
        { headers: { authorization: `Bearer ${token}` } },
        {},
        (value) => {
          error = value;
        },
      );
      assert.equal(error.statusCode, 401);
      assert.equal(error.code, "SESSION_EXPIRED");
    }
  }
});

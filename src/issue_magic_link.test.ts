import assert from "node:assert/strict";
import test from "node:test";
import { issueMagicLink } from "./issue_magic_link.ts";

test("active member creates a session and receives its sign-in link", async () => {
  const calls: string[] = [];
  const result = await issueMagicLink({
    tenantId: "acme", userId: "existing-user", email: "chenhua@changba.com",
    tenantState: "active", isAdmin: true,
  }, "http://localhost:3000/auth/complete", {
    auth: { session: { create: async (body) => {
      assert.deepEqual(body, { user_id: "existing-user", method: "magic_link" });
      calls.push("session");
      return { session_id: "session-1" };
    } } },
    email: { send: async (body) => {
      assert.equal(body.to, "chenhua@changba.com");
      assert.equal(body.subject, "Sign in to tenant acme");
      assert.match(body.html, /session_id=session-1/);
      calls.push("email");
      return { message_id: "message-1" };
    } },
  });
  assert.deepEqual(calls, ["session", "email"]);
  assert.deepEqual(result, { allowed: true, audience: "tenant-admin", messageId: "message-1" });
});

import assert from "node:assert/strict";
import test from "node:test";
import { decideMagicLinkAccess } from "./tenant_access.ts";

test("a suspended tenant cannot receive a magic link, including its admin", () => {
  const decision = decideMagicLinkAccess({
    tenantId: "acme",
    userId: "usr_123",
    email: "admin@acme.test",
    tenantState: "suspended",
    isAdmin: true,
  });

  assert.deepEqual(decision, { allowed: false, reason: "tenant_suspended" });
});

import { decideMagicLinkAccess, type TenantMember } from "./tenant_access.ts";

type Delivery = {
  auth: { session: { create: (body: { user_id: string; method: string }) => Promise<{ session_id: string }> } };
  email: { send: (body: { to: string; subject: string; html: string }) => Promise<{ message_id: string }> };
};

export async function issueMagicLink(member: TenantMember, returnTo: string, infrai: Delivery) {
  const decision = decideMagicLinkAccess(member);
  if (!decision.allowed) return decision;

  const session = await infrai.auth.session.create({ user_id: member.userId, method: "magic_link" });
  const link = new URL(returnTo);
  link.searchParams.set("session_id", session.session_id);
  const email = await infrai.email.send({
    to: member.email,
    subject: `Sign in to tenant ${member.tenantId}`,
    html: `<p><a href="${link.toString()}">Sign in</a></p>`,
  });

  return { allowed: true as const, audience: decision.audience, messageId: email.message_id };
}

export type TenantState = "active" | "suspended";

export type TenantMember = {
  tenantId: string;
  userId: string;
  email: string;
  tenantState: TenantState;
  isAdmin: boolean;
};

export type AccessDecision =
  | { allowed: true; audience: "tenant-admin" | "member" }
  | { allowed: false; reason: "tenant_suspended" };

export function decideMagicLinkAccess(member: TenantMember): AccessDecision {
  if (member.tenantState === "suspended") {
    return { allowed: false, reason: "tenant_suspended" };
  }

  return { allowed: true, audience: member.isAdmin ? "tenant-admin" : "member" };
}

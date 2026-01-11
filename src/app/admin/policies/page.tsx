import { requireRole } from "@/server/auth/require-user";
import { getMissionLimitsPolicy, getPricingPolicy, getPayoutPolicy } from "@/server/policy/get-policy";
import { AdminPoliciesClient } from "./AdminPoliciesClient";

interface PolicyData {
  missionLimits: any;
  pricing: any;
  payout: any;
}

async function getPolicyData(): Promise<PolicyData> {
  const [missionLimits, pricing, payout] = await Promise.all([
    getMissionLimitsPolicy(),
    getPricingPolicy(),
    getPayoutPolicy()
  ]);

  return { missionLimits, pricing, payout };
}

export default async function AdminPoliciesPage() {
  const user = await requireRole("ADMIN");
  const policyData = await getPolicyData();

  return (
    <AdminPoliciesClient
      initialData={policyData}
      userRole={user.adminType ?? null}
    />
  );
}

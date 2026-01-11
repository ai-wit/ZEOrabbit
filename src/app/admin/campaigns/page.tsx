import { redirect } from "next/navigation";

export default function LegacyAdminCampaignsRedirect() {
  redirect("/admin/experience?tab=campaigns");
}

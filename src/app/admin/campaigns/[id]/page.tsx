import { redirect } from "next/navigation";

export default function LegacyAdminCampaignDetailRedirect(props: { params: { id: string } }) {
  redirect(`/admin/reward/campaigns/${props.params.id}`);
}

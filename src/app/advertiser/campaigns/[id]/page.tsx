import { redirect } from "next/navigation";

function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

function formatKrw(n: number): string {
  return `${formatNumber(n)}원`;
}

export default function LegacyAdvertiserCampaignDetailRedirect(props: { params: { id: string } }) {
  redirect(`/advertiser/reward/campaigns/${props.params.id}`);
}
import { redirect } from "next/navigation";

export default function LegacyAdvertiserProductDetailRedirect(props: { params: { id: string } }) {
  redirect(`/advertiser/reward/products/${props.params.id}`);
}
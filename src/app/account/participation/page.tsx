import { CustomerShell } from "@/components/layout/customer-shell";
import { ParticipationView } from "@/modules/participation/participation-view";

export const metadata = {
  title: "Rewards & Participation | Palermo Parfums",
  description:
    "Review your Palermo loyalty points, boutique subscription preference and referral rewards.",
};

export default function AccountParticipationPage() {
  return (
    <CustomerShell>
      <ParticipationView />
    </CustomerShell>
  );
}

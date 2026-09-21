import type { Metadata } from "next";
import { CustomerAccount } from "@/modules/identity/ui/customer-account";

export const metadata: Metadata = {
  title: "Account | Palermo Parfums",
  description: "Manage your Palermo customer profile and saved addresses.",
};

export default function AccountPage() {
  return <CustomerAccount />;
}

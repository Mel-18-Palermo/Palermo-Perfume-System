import { AccountProfileClient } from "./_components/AccountProfileClient";

export default function AccountPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Account &amp; Profile</h1>
      <AccountProfileClient />
    </main>
  );
}

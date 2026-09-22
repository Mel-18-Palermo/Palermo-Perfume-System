import { AdminPasskeyEnrollment } from "@/modules/administration/ui/admin-passkey-enrollment";

export default function AdminSecurityPage() {
  return (
    <section aria-labelledby="security-heading" className="space-y-6">
      <div>
        <h1 id="security-heading" className="text-h2 font-semibold">Security</h1>
        <p className="mt-2 text-sm text-text-muted">
          Manage administrator authentication and the passkeys used to protect Palermo access.
        </p>
      </div>

      <section aria-label="Passkeys">
        <AdminPasskeyEnrollment />
      </section>
    </section>
  );
}

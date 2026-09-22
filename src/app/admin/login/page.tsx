import { AdminLogin } from "@/modules/administration/ui/admin-login";
import { safeNextPath } from "@/modules/identity/ui/safe-next-path";

type AdminLoginPageProps = Readonly<{ searchParams: Promise<{ next?: string | string[] }> }>;

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  return <AdminLogin nextPath={safeNextPath(params.next, "/admin")} />;
}

import { AdminLogin } from "@/modules/administration/ui/admin-login";
import { safeAdminNextPath } from "@/modules/administration/ui/admin-auth-routing";

type AdminLoginPageProps = Readonly<{ searchParams: Promise<{ next?: string | string[] }> }>;

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const params = await searchParams;
  return <AdminLogin nextPath={safeAdminNextPath(params.next)} />;
}

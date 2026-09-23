import { CustomerLogin } from "@/modules/identity/ui/customer-login";
import { safeNextPath } from "@/modules/identity/ui/safe-next-path";

type LoginPageProps = Readonly<{
  searchParams: Promise<{
    next?: string | string[];
  }>;
}>;

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <CustomerLogin
      nextPath={safeNextPath(params.next, "/")}
    />
  );
}

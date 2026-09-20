import { CustomerLogin } from "@/modules/identity/ui/customer-login";

type LoginPageProps = Readonly<{
  searchParams: Promise<{
    next?: string | string[];
  }>;
}>;

function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  return (
    <CustomerLogin
      nextPath={safeNext(params.next)}
    />
  );
}

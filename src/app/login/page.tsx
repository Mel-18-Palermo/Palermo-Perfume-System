import { CustomerLogin } from "@/modules/identity/ui/customer-login";

type LoginPageProps = Readonly<{
  searchParams: Promise<{
    next?: string | string[];
  }>;
}>;

function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return "/";
  }

  try {
    const base = new URL("https://palermo.invalid");
    const target = new URL(value, base);

    if (target.origin !== base.origin) {
      return "/";
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
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

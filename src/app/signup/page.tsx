import { CustomerSignup } from "@/modules/identity/ui/customer-signup";

type SignupPageProps = Readonly<{
  searchParams: Promise<{ next?: string | string[] }>;
}>;

function safeNext(value: string | string[] | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";

  try {
    const base = new URL("https://palermo.invalid");
    const target = new URL(value, base);
    return target.origin === base.origin ? `${target.pathname}${target.search}${target.hash}` : "/";
  } catch {
    return "/";
  }
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);

  return <CustomerSignup loginHref={`/login?next=${encodeURIComponent(nextPath)}`} />;
}

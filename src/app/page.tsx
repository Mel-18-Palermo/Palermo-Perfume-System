import { CircleCheck, HeartPulse } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10 text-foreground md:px-6 md:py-16 lg:px-8">
      <section className="mx-auto flex max-w-reading flex-col gap-6">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <CircleCheck aria-hidden="true" size={20} strokeWidth={1.75} />
          <span>Implementation foundation active</span>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            Palermo Perfume System
          </p>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Application scaffold
          </h1>
          <p className="max-w-reading text-base leading-6 text-muted-foreground">
            The Next.js, React and strict TypeScript foundation is ready for
            contract, persistence and feature implementation.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <HeartPulse
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-success"
              size={24}
              strokeWidth={1.75}
            />
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">Health surface</h2>
              <p className="text-sm leading-5 text-muted-foreground">
                The server exposes a minimal non-sensitive health endpoint for
                local and later automated smoke validation.
              </p>
              <a
                className="w-fit text-sm font-medium underline underline-offset-4"
                href="/api/health"
              >
                Open /api/health
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

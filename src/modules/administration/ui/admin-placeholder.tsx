import { adminSections } from "./admin-sections";
import type { AdminSection } from "./admin-sections";

type AdminPlaceholderProps = Readonly<{
  section: AdminSection;
}>;

export function AdminPlaceholder({ section }: AdminPlaceholderProps) {
  const content = adminSections[section];

  return (
    <section
      aria-labelledby={`${section}-heading`}
      className="space-y-4"
    >
      <h1
        id={`${section}-heading`}
        className="text-h1 font-bold"
      >
        {content.title}
      </h1>
      <p className="max-w-reading text-base text-text-muted">
        {content.description}
      </p>
      <div className="border-y border-border py-5">
        <p className="text-sm font-medium text-text">This workspace is being prepared.</p>
        <p className="mt-1 text-sm text-text-muted">No management actions are available in this release.</p>
      </div>
    </section>
  );
}

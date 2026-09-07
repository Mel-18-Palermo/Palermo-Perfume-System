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
      <p className="text-sm text-text-muted">
        This section is not connected yet.
      </p>
    </section>
  );
}

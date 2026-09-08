"use client";

import * as React from "react";
import type { AdminPerfume } from "@/contracts/admin";
import { AdminCatalogueList } from "@/modules/administration/ui/catalogue/admin-catalogue-list";
import { AdminPerfumeForm } from "@/modules/administration/ui/catalogue/admin-perfume-form";
import { AdminVariantList } from "@/modules/administration/ui/catalogue/admin-variant-list";

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "edit"; perfume: AdminPerfume };

export default function Page() {
  const [view, setView] = React.useState<View>({ mode: "list" });

  if (view.mode === "create") {
    return (
      <AdminPerfumeForm
        mode="create"
        onSaved={() => setView({ mode: "list" })}
        onCancel={() => setView({ mode: "list" })}
      />
    );
  }

  if (view.mode === "edit") {
    return (
      <div className="space-y-8">
        <AdminPerfumeForm
          mode="edit"
          initialPerfume={view.perfume}
          onSaved={() => setView({ mode: "list" })}
          onCancel={() => setView({ mode: "list" })}
        />
        <AdminVariantList perfume={view.perfume} />
      </div>
    );
  }

  return (
    <AdminCatalogueList
      onCreate={() => setView({ mode: "create" })}
      onEdit={perfume => setView({ mode: "edit", perfume })}
    />
  );
}

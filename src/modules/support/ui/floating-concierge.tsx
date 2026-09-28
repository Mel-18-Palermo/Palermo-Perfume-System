"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import type { Session } from "@/contracts/auth";
import { SupportAssistance } from "./support-assistance";

export function FloatingConcierge({ session, sessionLoading }: Readonly<{ session: Session | null; sessionLoading: boolean }>) {
  const [open, setOpen] = React.useState(false);
  return <><button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-4 z-30 inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-primary px-4 text-sm font-medium text-primary-text shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:bottom-7 sm:right-7" aria-label="Open Palermo concierge"><MessageCircle className="h-4 w-4" aria-hidden="true" /><span>Concierge</span></button><Drawer isOpen={open} onClose={() => setOpen(false)} title="Palermo concierge" size="concierge"><SupportAssistance session={session} sessionLoading={sessionLoading} compact /></Drawer></>;
}

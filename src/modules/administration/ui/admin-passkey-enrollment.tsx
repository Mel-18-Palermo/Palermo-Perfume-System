"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function AdminPasskeyEnrollment() {
  const [label, setLabel] = useState(""); const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  async function add(): Promise<void> {
    if (state === "working") return; setState("working"); setMessage("");
    try {
      const options = await api.auth.adminPasskeyRegisterOptions();
      if (!options.ok) { setState("error"); setMessage(options.error.message); return; }
      const registration = await startRegistration({ optionsJSON: options.data.options as PublicKeyCredentialCreationOptionsJSON });
      const verified = await api.auth.adminPasskeyRegisterVerify({ response: registration, ...(label.trim() ? { label: label.trim() } : {}) });
      if (!verified.ok) { setState("error"); setMessage(verified.error.message); return; }
      setState("done"); setMessage("Passkey registered successfully."); setLabel("");
    } catch { setState("error"); setMessage("Passkey registration could not be completed."); }
  }
  return <Card className="p-5"><h2 className="text-h3 font-semibold">Passkeys</h2><p className="mt-2 text-sm text-text-muted">Add a passkey for faster, phishing-resistant administrator sign-in.</p><div className="mt-4 flex flex-wrap items-end gap-3"><label className="block text-sm font-medium">Passkey label<input value={label} maxLength={120} onChange={event => setLabel(event.target.value)} placeholder="e.g. Work MacBook" className="mt-2 block min-h-[44px] rounded-md border border-border bg-surface px-3 py-2" /></label><Button type="button" isLoading={state === "working"} onClick={() => { void add(); }}>Register passkey</Button></div>{state !== "idle" ? <p role={state === "error" ? "alert" : "status"} className="mt-3 text-sm text-text-muted">{message || "Waiting for your passkey…"}</p> : null}</Card>;
}

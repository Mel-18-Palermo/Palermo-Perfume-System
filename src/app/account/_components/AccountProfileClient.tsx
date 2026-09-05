"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { AddressForm } from "./AddressForm";
import { fetchMockProfile, fetchMockProfileError, MOCK_FRAGRANCE_NOTES } from "../_lib/mock-data";
import type { CustomerProfile, FragranceIntensity } from "../_lib/types";

type LoadState = "loading" | "loaded" | "error";

export function AccountProfileClient() {
  const [state, setState] = React.useState<LoadState>("loading");
  const [profile, setProfile] = React.useState<CustomerProfile | null>(null);
  const [nameDraft, setNameDraft] = React.useState("");
  const [nameError, setNameError] = React.useState("");
  const [deactivateOpen, setDeactivateOpen] = React.useState(false);

  const load = React.useCallback(() => {
    setState("loading");
    fetchMockProfile()
      .then((p) => {
        setProfile(p);
        setNameDraft(p.name);
        setState("loaded");
      })
      .catch(() => setState("error"));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function simulateError() {
    setState("loading");
    fetchMockProfileError().catch(() => setState("error"));
  }

  function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!nameDraft.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }
    setNameError("");
    setProfile((prev) => (prev ? { ...prev, name: nameDraft.trim() } : prev));
  }

  function toggleNote(noteId: string) {
    setProfile((prev) => {
      if (!prev) return prev;
      const has = prev.fragrancePreferences.favouriteNoteIds.includes(noteId);
      const favouriteNoteIds = has
        ? prev.fragrancePreferences.favouriteNoteIds.filter((id) => id !== noteId)
        : [...prev.fragrancePreferences.favouriteNoteIds, noteId];
      return {
        ...prev,
        fragrancePreferences: { ...prev.fragrancePreferences, favouriteNoteIds },
      };
    });
  }

  function setIntensity(value: FragranceIntensity) {
    setProfile((prev) =>
      prev
        ? { ...prev, fragrancePreferences: { ...prev.fragrancePreferences, preferredIntensity: value } }
        : prev
    );
  }

  function setSensitivity(value: string) {
    setProfile((prev) =>
      prev
        ? { ...prev, fragrancePreferences: { ...prev.fragrancePreferences, sensitivityNotes: value } }
        : prev
    );
  }

  if (state === "loading") {
    return (
      <div className="space-y-4" aria-live="polite" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 w-full animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (state === "error") {
    return (
      <EmptyState
        title="We couldn't load your account"
        description="Something went wrong while fetching your profile. Please try again."
        action={<Button onClick={load}>Try again</Button>}
      />
    );
  }

  if (!profile) return null;

  const hasPositivePreference =
    profile.fragrancePreferences.favouriteNoteIds.length > 0 ||
    !!profile.fragrancePreferences.preferredIntensity;

  return (
    <div className="space-y-6">
      {/* Account overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account overview</CardTitle>
          <CardDescription>Your account status and basic details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {profile.name}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {profile.email}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="font-medium">{profile.accountStatus}</span>
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" size="sm" onClick={simulateError}>
            Simulate error (dev)
          </Button>
        </CardFooter>
      </Card>

      {/* Profile form (FR-PROFILE-001) */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Full name"
                value={nameDraft}
                error={nameError}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            </div>
            <Button type="submit">Save profile</Button>
          </form>
        </CardContent>
      </Card>

      {/* Delivery address (FR-PROFILE-002) */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery address</CardTitle>
          <CardDescription>Used for shipping your orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddressForm
            title="delivery address"
            value={profile.deliveryAddress}
            onSave={(addr) => setProfile((prev) => (prev ? { ...prev, deliveryAddress: addr } : prev))}
          />
        </CardContent>
      </Card>

      {/* Billing address (FR-PROFILE-003) */}
      <Card>
        <CardHeader>
          <CardTitle>Billing address</CardTitle>
          <CardDescription>Used for invoices and payment records.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={profile.billingSameAsDelivery}
              onChange={(e) =>
                setProfile((prev) => (prev ? { ...prev, billingSameAsDelivery: e.target.checked } : prev))
              }
              className="h-4 w-4 rounded border-border"
            />
            Same as delivery address
          </label>
          {!profile.billingSameAsDelivery && (
            <AddressForm
              title="billing address"
              value={profile.billingAddress}
              onSave={(addr) => setProfile((prev) => (prev ? { ...prev, billingAddress: addr } : prev))}
            />
          )}
        </CardContent>
      </Card>

      {/* Fragrance preferences (FR-PROFILE-004/005/006/007) */}
      <Card>
        <CardHeader>
          <CardTitle>Fragrance preferences</CardTitle>
          <CardDescription>
            All fields below are optional. This information powers your Fragrance Identity and
            recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Favourite notes</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_FRAGRANCE_NOTES.map((note) => {
                const selected = profile.fragrancePreferences.favouriteNoteIds.includes(note.id);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => toggleNote(note.id)}
                    aria-pressed={selected}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-surface text-foreground hover:bg-surface-muted"
                    }`}
                  >
                    {note.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Preferred intensity</p>
            <div className="flex gap-2">
              {(["light", "moderate", "strong"] as FragranceIntensity[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setIntensity(level)}
                  aria-pressed={profile.fragrancePreferences.preferredIntensity === level}
                  className={`rounded-md border px-3 py-1.5 text-xs capitalize transition-colors ${
                    profile.fragrancePreferences.preferredIntensity === level
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sensitivity" className="mb-2 block text-xs font-medium text-foreground">
              Notes or characteristics you&apos;d prefer to avoid (optional)
            </label>
            <textarea
              id="sensitivity"
              value={profile.fragrancePreferences.sensitivityNotes ?? ""}
              onChange={(e) => setSensitivity(e.target.value)}
              rows={3}
              placeholder="e.g. strong musk, very sweet vanilla"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This is a personal preference note, not medical or health information.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="sm">Save preferences</Button>
        </CardFooter>
      </Card>

      {/* Fragrance identity (FR-PROFILE-008) */}
      <Card>
        <CardHeader>
          <CardTitle>Your Fragrance Identity</CardTitle>
          <CardDescription>Generated automatically from your preferences above.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPositivePreference ? (
            <EmptyState
              title="Not enough information yet"
              description="Select at least one favourite note or a preferred intensity to generate your Fragrance Identity."
            />
          ) : profile.fragranceIdentity ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {profile.fragranceIdentity.primaryFamily}
              </p>
              <p className="text-sm text-muted-foreground">{profile.fragranceIdentity.explanation}</p>
              {profile.fragranceIdentity.isStale && (
                <p className="text-xs font-medium text-danger">
                  Your preferences changed — regenerate to see an updated result.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              title="Not generated yet"
              description="Generate your Fragrance Identity based on your current preferences."
            />
          )}
        </CardContent>
        <CardFooter>
          <Button size="sm" disabled={!hasPositivePreference}>
            Regenerate Fragrance Identity
          </Button>
        </CardFooter>
      </Card>

      {/* Account deactivation — presentation only, per issue scope (FR-AUTH-007 server logic is separate) */}
      <Card>
        <CardHeader>
          <CardTitle>Deactivate account</CardTitle>
          <CardDescription>
            This will deactivate your account. This is not the same as deleting it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!deactivateOpen ? (
            <Button variant="danger" size="sm" onClick={() => setDeactivateOpen(true)}>
              Deactivate my account
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm text-foreground">
                Are you sure you want to deactivate your account? You won&apos;t be able to log in
                until it is reactivated by support.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm">
                  Yes, deactivate
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeactivateOpen(false)}>
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Note: this is a presentation-only confirmation for this task. Deactivation server
                logic is implemented separately (FR-AUTH-007).
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

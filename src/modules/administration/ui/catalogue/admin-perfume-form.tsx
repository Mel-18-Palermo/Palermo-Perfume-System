"use client";

import * as React from "react";
import type { AdminPerfume } from "@/contracts/admin";
import type { CatalogueFilters, NoteAssignment, PerfumeImageSummary } from "@/contracts/catalogue";
import { getAdminCatalogueApi, getCatalogueFilters } from "./admin-catalogue-api";
import { AdminButton, AdminErrorState, AdminSkeleton } from "./admin-ui-kit";

type NoteLayer = NoteAssignment["layer"];

type FiltersState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; filters: CatalogueFilters };

interface FormValues {
  name: string;
  slug: string;
  description: string;
  primaryFamilyId: string;
  intensityId: string;
  notes: NoteAssignment[];
  occasionIds: string[];
  moodIds: string[];
  weatherIds: string[];
  images: PerfumeImageSummary[];
}

function initialValues(initialPerfume: AdminPerfume | undefined): FormValues {
  const perfume = initialPerfume?.perfume;
  return {
    name: perfume?.name ?? "",
    slug: perfume?.slug ?? "",
    description: perfume?.description ?? "",
    primaryFamilyId: perfume?.primaryFamily.id ?? "",
    intensityId: perfume?.intensity?.id ?? "",
    notes: perfume?.notes ? [...perfume.notes] : [],
    occasionIds: perfume?.suitability.occasion.map(option => option.id) ?? [],
    moodIds: perfume?.suitability.mood.map(option => option.id) ?? [],
    weatherIds: perfume?.suitability.weather.map(option => option.id) ?? [],
    images: perfume?.images ? [...perfume.images] : [],
  };
}

export interface AdminPerfumeFormProps {
  mode: "create" | "edit";
  initialPerfume?: AdminPerfume;
  onSaved?: (perfume: AdminPerfume) => void;
  onCancel?: () => void;
}

export function AdminPerfumeForm({ mode, initialPerfume, onSaved, onCancel }: AdminPerfumeFormProps) {
  const perfumeToEdit = initialPerfume;

  const [filtersState, setFiltersState] = React.useState<FiltersState>({ status: "loading" });
  const [values, setValues] = React.useState<FormValues>(() => initialValues(perfumeToEdit));
  const [fieldErrors, setFieldErrors] = React.useState<Readonly<Record<string, readonly string[]>>>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingNoteId, setPendingNoteId] = React.useState("");
  const [pendingLayer, setPendingLayer] = React.useState<NoteLayer>("TOP");
  const [pendingImageUrl, setPendingImageUrl] = React.useState("");
  const [pendingImageAlt, setPendingImageAlt] = React.useState("");

  React.useEffect(() => {
    void getCatalogueFilters().then(result => {
      if (!result.ok) {
        setFiltersState({ status: "error", message: result.error.message });
        return;
      }
      setFiltersState({ status: "ready", filters: result.data });
    });
  }, []);

  if (mode === "edit" && !perfumeToEdit) {
    return <AdminErrorState title="Missing perfume" message="No perfume was provided to edit." />;
  }

  const toggleInArray = (list: readonly string[], id: string): string[] =>
    list.includes(id) ? list.filter(item => item !== id) : [...list, id];

  const addNote = () => {
    if (!pendingNoteId || filtersState.status !== "ready") return;
    if (values.notes.some(note => note.id === pendingNoteId)) return;
    const option = filtersState.filters.note.find(note => note.id === pendingNoteId);
    if (!option) return;
    setValues(current => ({
      ...current,
      notes: [...current.notes, { ...option, layer: pendingLayer }],
    }));
    setPendingNoteId("");
  };

  const removeNote = (id: string) => {
    setValues(current => ({ ...current, notes: current.notes.filter(note => note.id !== id) }));
  };

  const addImage = () => {
    if (!pendingImageUrl.trim() || !pendingImageAlt.trim()) return;
    setValues(current => ({
      ...current,
      images: [...current.images, { id: `image-${Date.now()}-${current.images.length}`, url: pendingImageUrl.trim(), alt: pendingImageAlt.trim() }],
    }));
    setPendingImageUrl("");
    setPendingImageAlt("");
  };

  const removeImage = (id: string) => {
    setValues(current => ({ ...current, images: current.images.filter(image => image.id !== id) }));
  };

  const validate = (): Readonly<Record<string, readonly string[]>> => {
    const errors: Record<string, string[]> = {};
    if (!values.name.trim()) errors.name = ["Enter a name."];
    if (!values.description.trim()) errors.description = ["Enter a description."];
    if (!values.primaryFamilyId) errors.primaryFamilyId = ["Choose a fragrance family."];
    return errors;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (filtersState.status !== "ready") return;
    if (mode === "edit" && perfumeToEdit === undefined) {
      setSubmitError("No perfume was provided to edit.");
      return;
    }
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    const api = getAdminCatalogueApi();
    const input = {
      name: values.name.trim(),
      slug: values.slug.trim() || values.name.trim().toLowerCase().replace(/\s+/g, "-"),
      description: values.description.trim(),
      primaryFamilyId: values.primaryFamilyId,
      intensity: values.intensityId ? filtersState.filters.intensity.find(option => option.id === values.intensityId) ?? null : null,
      notes: values.notes,
      suitability: {
        occasion: filtersState.filters.occasion.filter(option => values.occasionIds.includes(option.id)),
        mood: filtersState.filters.mood.filter(option => values.moodIds.includes(option.id)),
        weather: filtersState.filters.weather.filter(option => values.weatherIds.includes(option.id)),
        daypart: perfumeToEdit?.perfume.suitability.daypart ?? [],
        season: perfumeToEdit?.perfume.suitability.season ?? [],
      },
      images: values.images,
      longevity: perfumeToEdit?.perfume.longevity ?? null,
      projection: perfumeToEdit?.perfume.projection ?? null,
    };

    const request = mode === "create"
      ? api.createPerfume({ ...input, idempotencyKey: crypto.randomUUID() })
      : perfumeToEdit
        ? api.updatePerfume({ ...input, id: perfumeToEdit.perfume.id, expectedRevision: perfumeToEdit.revision })
        : null;

    if (!request) {
      setSubmitting(false);
      setSubmitError("No perfume was provided to edit.");
      return;
    }

    void request.then(result => {
      setSubmitting(false);
      if (!result.ok) {
        setSubmitError(result.error.message);
        return;
      }
      onSaved?.(result.data);
    });
  };

  if (filtersState.status === "loading") {
    return (
      <div className="space-y-2" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading form options…</span>
        <AdminSkeleton className="h-10 w-full" />
        <AdminSkeleton className="h-10 w-full" />
        <AdminSkeleton className="h-32 w-full" />
      </div>
    );
  }

  if (filtersState.status === "error") {
    return <AdminErrorState title="Could not load form options" message={filtersState.message} />;
  }

  const { filters } = filtersState;

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-form space-y-6" aria-labelledby="admin-perfume-form-heading">
      <h2 id="admin-perfume-form-heading" className="text-h2 font-semibold">
        {mode === "create" ? "Add perfume" : "Edit perfume"}
      </h2>

      <p className="rounded-md bg-info-bg px-3 py-2 text-sm text-info">
        This form uses a fixture-based mock. The saved record will be a fixed demo perfume, not your exact input, until real persistence is implemented under #270.
      </p>

      {submitError ? (
        <p role="alert" className="rounded-md bg-danger-bg px-3 py-2 text-sm text-danger">
          {submitError}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="perfume-name" className="text-label">Name</label>
        <input
          id="perfume-name"
          type="text"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.name}
          onChange={event => setValues(current => ({ ...current, name: event.target.value }))}
          aria-describedby={fieldErrors.name ? "perfume-name-error" : undefined}
          aria-invalid={fieldErrors.name ? true : undefined}
        />
        {fieldErrors.name ? (
          <p id="perfume-name-error" role="alert" className="text-sm text-danger">{fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="perfume-slug" className="text-label">Slug</label>
        <input
          id="perfume-slug"
          type="text"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.slug}
          onChange={event => setValues(current => ({ ...current, slug: event.target.value }))}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="perfume-description" className="text-label">Description</label>
        <textarea
          id="perfume-description"
          rows={4}
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.description}
          onChange={event => setValues(current => ({ ...current, description: event.target.value }))}
          aria-describedby={fieldErrors.description ? "perfume-description-error" : undefined}
          aria-invalid={fieldErrors.description ? true : undefined}
        />
        {fieldErrors.description ? (
          <p id="perfume-description-error" role="alert" className="text-sm text-danger">{fieldErrors.description[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="perfume-family" className="text-label">Fragrance family</label>
        <select
          id="perfume-family"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.primaryFamilyId}
          onChange={event => setValues(current => ({ ...current, primaryFamilyId: event.target.value }))}
          aria-describedby={fieldErrors.primaryFamilyId ? "perfume-family-error" : undefined}
          aria-invalid={fieldErrors.primaryFamilyId ? true : undefined}
        >
          <option value="">Select a family…</option>
          {filters.family.map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
        {fieldErrors.primaryFamilyId ? (
          <p id="perfume-family-error" role="alert" className="text-sm text-danger">{fieldErrors.primaryFamilyId[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label htmlFor="perfume-intensity" className="text-label">Intensity</label>
        <select
          id="perfume-intensity"
          className="w-full rounded-md border border-border px-3 py-2"
          value={values.intensityId}
          onChange={event => setValues(current => ({ ...current, intensityId: event.target.value }))}
        >
          <option value="">None</option>
          {filters.intensity.map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-label">Notes</legend>
        <ul className="flex flex-wrap gap-2">
          {values.notes.map(note => (
            <li key={note.id} className="flex items-center gap-2 rounded-full border border-border px-3 py-1 text-sm">
              {note.label} ({note.layer})
              <button type="button" onClick={() => removeNote(note.id)} aria-label={`Remove ${note.label}`} className="text-text-muted hover:text-danger">
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="perfume-note-select" className="text-xs text-text-muted">Note</label>
            <select
              id="perfume-note-select"
              className="rounded-md border border-border px-3 py-2"
              value={pendingNoteId}
              onChange={event => setPendingNoteId(event.target.value)}
            >
              <option value="">Select a note…</option>
              {filters.note.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="perfume-note-layer" className="text-xs text-text-muted">Layer</label>
            <select
              id="perfume-note-layer"
              className="rounded-md border border-border px-3 py-2"
              value={pendingLayer}
              onChange={event => setPendingLayer(event.target.value as NoteLayer)}
            >
              <option value="TOP">Top</option>
              <option value="MIDDLE">Middle</option>
              <option value="BASE">Base</option>
            </select>
          </div>
          <AdminButton type="button" variant="secondary" size="sm" onClick={addNote}>
            Add note
          </AdminButton>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-label">Occasion</legend>
        <div className="flex flex-wrap gap-3">
          {filters.occasion.map(option => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.occasionIds.includes(option.id)}
                onChange={() => setValues(current => ({ ...current, occasionIds: toggleInArray(current.occasionIds, option.id) }))}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-label">Mood</legend>
        <div className="flex flex-wrap gap-3">
          {filters.mood.map(option => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.moodIds.includes(option.id)}
                onChange={() => setValues(current => ({ ...current, moodIds: toggleInArray(current.moodIds, option.id) }))}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-label">Weather</legend>
        <div className="flex flex-wrap gap-3">
          {filters.weather.map(option => (
            <label key={option.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.weatherIds.includes(option.id)}
                onChange={() => setValues(current => ({ ...current, weatherIds: toggleInArray(current.weatherIds, option.id) }))}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1 opacity-60">
        <legend className="text-label">Daypart, season, longevity, projection</legend>
        <p className="text-sm text-text-muted">
          Not yet available — no contract-approved option list exists for these fields yet.
        </p>
        <select disabled className="w-full rounded-md border border-border px-3 py-2" aria-label="Daypart (not yet available)">
          <option>Not yet available</option>
        </select>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-label">Images</legend>
        <ul className="space-y-2">
          {values.images.map(image => (
            <li key={image.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="truncate">{image.alt} — {image.url}</span>
              <button type="button" onClick={() => removeImage(image.id)} aria-label={`Remove image ${image.alt}`} className="text-text-muted hover:text-danger">
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor="perfume-image-url" className="text-xs text-text-muted">Image URL</label>
            <input
              id="perfume-image-url"
              type="text"
              className="rounded-md border border-border px-3 py-2"
              value={pendingImageUrl}
              onChange={event => setPendingImageUrl(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="perfume-image-alt" className="text-xs text-text-muted">Alt text</label>
            <input
              id="perfume-image-alt"
              type="text"
              className="rounded-md border border-border px-3 py-2"
              value={pendingImageAlt}
              onChange={event => setPendingImageAlt(event.target.value)}
            />
          </div>
          <AdminButton type="button" variant="secondary" size="sm" onClick={addImage}>
            Add image
          </AdminButton>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2">
        <AdminButton type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </AdminButton>
        <AdminButton type="submit" isLoading={submitting} disabled={submitting}>
          {mode === "create" ? "Create perfume" : "Save changes"}
        </AdminButton>
      </div>
    </form>
  );
}

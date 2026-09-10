import type { Prisma, PrismaClient } from "../../lib/db/generated/client";
import type { AddressInput, BillingAddressInput, CustomerProfile, FragrancePreferences, ProfileUpdate } from "../../contracts/profile";
import type { ApiResult, Revision } from "../../contracts/common";
import { failure, success } from "../../lib/api/result";

type LoadedProfile = Prisma.FragranceProfileGetPayload<{ include: { favouriteNotes: { include: { note: true } }; preferredIntensity: true; identity: { include: { primaryFamily: true } } } }>;
type LoadedCustomer = Prisma.CustomerGetPayload<{ include: { addresses: true; profile: true } }> & { profile: LoadedProfile | null };
type Actor = Readonly<{ customerId: string }>;

class RevisionConflict extends Error {}

function revision(value: number): Revision { return `profile-${value}`; }
function parseRevision(value: Revision): number | null { const match = /^profile-([1-9][0-9]*)$/.exec(value); return match ? Number(match[1]) : null; }
function id(value: string): boolean { return /^[0-9a-f-]{10,64}$/i.test(value); }
function text(value: unknown, max: number): value is string { return typeof value === "string" && value.trim().length > 0 && value.trim().length <= max && !/[\u0000-\u001f\u007f]/.test(value); }
function address(value: AddressInput): boolean {
  return text(value.recipientName, 100) && text(value.line1, 200) && (value.line2 === null || text(value.line2, 200))
    && text(value.suburb, 100) && text(value.state, 100) && /^[A-Za-z0-9 -]{3,16}$/.test(value.postcode)
    && /^[A-Z]{2}$/.test(value.country);
}
function preferences(value: FragrancePreferences): boolean {
  return Array.isArray(value.favouriteNoteIds) && value.favouriteNoteIds.every(id)
    && (value.preferredIntensityId === null || id(value.preferredIntensityId))
    && (value.sensitivityAvoidance === null || (text(value.sensitivityAvoidance, 500) && !/\b(allerg(?:y|ies)|diagnos|medical|medication|disease|symptom|condition)\b/i.test(value.sensitivityAvoidance)));
}

export class ProfileService {
  constructor(private readonly db: PrismaClient, private readonly now: () => Date = () => new Date()) {}
  private async load(customerId: string): Promise<LoadedCustomer | null> {
    const customer = await this.db.customer.findUnique({ where: { id: customerId }, include: { addresses: true, profile: true } });
    if (!customer) return null;
    const profile = customer.profile ? await this.db.fragranceProfile.findUnique({ where: { id: customer.profile.id }, include: { favouriteNotes: { include: { note: true } }, preferredIntensity: true, identity: { include: { primaryFamily: true } } } }) : null;
    return { ...customer, profile };
  }
  private async ensure(customerId: string): Promise<LoadedCustomer | null> {
    const customer = await this.load(customerId);
    if (!customer || customer.status !== "ACTIVE") return null;
    if (!customer.profile) await this.db.fragranceProfile.create({ data: { customerId } });
    return this.load(customerId);
  }
  private dto(customer: LoadedCustomer): CustomerProfile {
    const profile = customer.profile;
    const delivery = customer.addresses.find(item => item.type === "DELIVERY");
    const billing = customer.billingSameAsDelivery ? delivery : customer.addresses.find(item => item.type === "BILLING");
    return {
      id: customer.id, name: customer.name, email: customer.email, accountStatus: customer.status, revision: revision(customer.revision),
      deliveryAddress: delivery ? this.addressDto(delivery) : null, billingAddress: billing ? this.addressDto(billing) : null,
      billingSameAsDelivery: customer.billingSameAsDelivery,
      preferences: { favouriteNoteIds: profile?.favouriteNotes.map(item => item.noteId) ?? [], preferredIntensityId: profile?.preferredIntensityId ?? null, sensitivityAvoidance: profile?.sensitivityAvoidance ?? null },
      fragranceIdentity: profile?.identity ? { primaryFamily: { id: profile.identity.primaryFamily.id, label: profile.identity.primaryFamily.name }, explanation: profile.identity.explanation, status: profile.identity.status, generatedAt: profile.identity.generatedAt.toISOString() } : null,
    };
  }
  private addressDto(value: LoadedCustomer["addresses"][number]): AddressInput & { id: string } { const { id, recipientName, line1, line2, suburb, state, postcode, country } = value; return { id, recipientName, line1, line2, suburb, state, postcode, country }; }
  private check(customer: LoadedCustomer, expected: Revision): ApiResult<null> { return parseRevision(expected) === customer.revision ? success(null) : failure("CONFLICT"); }
  private async mutate(
    actor: Actor,
    expected: Revision,
    mutation: (tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<ApiResult<null>> {
    const expectedRevision = parseRevision(expected);
    if (expectedRevision === null) return failure("CONFLICT");
    try {
      await this.db.$transaction(async tx => {
        const claimed = await tx.customer.updateMany({
          where: { id: actor.customerId, status: "ACTIVE", revision: expectedRevision },
          data: { revision: { increment: 1 } },
        });
        if (claimed.count !== 1) throw new RevisionConflict();
        await mutation(tx);
      });
      return success(null);
    } catch (error) {
      if (error instanceof RevisionConflict) return failure("CONFLICT");
      throw error;
    }
  }
  async get(actor: Actor): Promise<ApiResult<CustomerProfile>> { if (!id(actor.customerId)) return failure("VALIDATION_ERROR"); const customer = await this.ensure(actor.customerId); return customer ? success(this.dto(customer)) : failure("UNAUTHENTICATED"); }

  async update(actor: Actor, input: ProfileUpdate): Promise<ApiResult<CustomerProfile>> {
    if (!text(input.name, 100) || !preferences(input.preferences)) return failure("VALIDATION_ERROR");
    const customer = await this.ensure(actor.customerId); if (!customer) return failure("UNAUTHENTICATED"); const checked = this.check(customer, input.expectedRevision); if (!checked.ok) return checked;
    const notes = await this.db.fragranceNote.findMany({ where: { id: { in: [...input.preferences.favouriteNoteIds] }, active: true }, select: { id: true } });
    const intensity = input.preferences.preferredIntensityId === null ? null : await this.db.intensity.findFirst({ where: { id: input.preferences.preferredIntensityId, active: true } });
    if (notes.length !== input.preferences.favouriteNoteIds.length || (input.preferences.preferredIntensityId !== null && !intensity)) return failure("VALIDATION_ERROR");
    const mutated = await this.mutate(actor, input.expectedRevision, async tx => {
      const profile = await tx.fragranceProfile.upsert({ where: { customerId: actor.customerId }, update: { preferredIntensityId: input.preferences.preferredIntensityId, sensitivityAvoidance: input.preferences.sensitivityAvoidance }, create: { customerId: actor.customerId, preferredIntensityId: input.preferences.preferredIntensityId, sensitivityAvoidance: input.preferences.sensitivityAvoidance } });
      await tx.profileFavouriteNote.deleteMany({ where: { profileId: profile.id } });
      if (input.preferences.favouriteNoteIds.length) await tx.profileFavouriteNote.createMany({ data: input.preferences.favouriteNoteIds.map(noteId => ({ profileId: profile.id, noteId })) });
      if (profile.id) { const identity = await tx.fragranceIdentity.findUnique({ where: { profileId: profile.id } }); if (identity) await tx.fragranceIdentity.update({ where: { profileId: profile.id }, data: { status: "STALE" } }); }
      await tx.customer.update({ where: { id: actor.customerId }, data: { name: input.name.trim() } });
    });
    if (!mutated.ok) return mutated;
    return this.get(actor);
  }

  async setDeliveryAddress(actor: Actor, input: { expectedRevision: Revision; address: AddressInput }): Promise<ApiResult<CustomerProfile>> {
    if (!address(input.address)) return failure("VALIDATION_ERROR"); const customer = await this.ensure(actor.customerId); if (!customer) return failure("UNAUTHENTICATED"); const checked = this.check(customer, input.expectedRevision); if (!checked.ok) return checked;
    const mutated = await this.mutate(actor, input.expectedRevision, tx => tx.address.upsert({ where: { customerId_type: { customerId: actor.customerId, type: "DELIVERY" } }, update: input.address, create: { customerId: actor.customerId, type: "DELIVERY", ...input.address } }));
    if (!mutated.ok) return mutated;
    return this.get(actor);
  }

  async setBillingAddress(actor: Actor, input: { expectedRevision: Revision; billing: BillingAddressInput }): Promise<ApiResult<CustomerProfile>> {
    const customer = await this.ensure(actor.customerId); if (!customer) return failure("UNAUTHENTICATED"); const checked = this.check(customer, input.expectedRevision); if (!checked.ok) return checked;
    if (input.billing.kind === "SEPARATE" && !address(input.billing.address)) return failure("VALIDATION_ERROR");
    if (input.billing.kind === "USE_DELIVERY" && !customer.addresses.some(item => item.type === "DELIVERY")) return failure("VALIDATION_ERROR");
    const mutated = await this.mutate(actor, input.expectedRevision, async tx => { if (input.billing.kind === "USE_DELIVERY") { await tx.address.deleteMany({ where: { customerId: actor.customerId, type: "BILLING" } }); await tx.customer.update({ where: { id: actor.customerId }, data: { billingSameAsDelivery: true } }); } else { await tx.address.upsert({ where: { customerId_type: { customerId: actor.customerId, type: "BILLING" } }, update: input.billing.address, create: { customerId: actor.customerId, type: "BILLING", ...input.billing.address } }); await tx.customer.update({ where: { id: actor.customerId }, data: { billingSameAsDelivery: false } }); } });
    if (!mutated.ok) return mutated;
    return this.get(actor);
  }

  async generateIdentity(actor: Actor, input: { expectedRevision: Revision }): Promise<ApiResult<CustomerProfile>> {
    const customer = await this.ensure(actor.customerId); if (!customer) return failure("UNAUTHENTICATED"); const checked = this.check(customer, input.expectedRevision); if (!checked.ok) return checked; const profile = customer.profile; if (!profile || (!profile.preferredIntensityId && !profile.favouriteNotes.length)) return failure("VALIDATION_ERROR");
    const firstNote = profile.favouriteNotes[0];
    const byNote = firstNote ? await this.db.perfume.findFirst({ where: { status: "ACTIVE", notes: { some: { noteId: firstNote.noteId } } }, include: { primaryFamily: true }, orderBy: { primaryFamily: { name: "asc" } } }) : null;
    const byIntensity = profile.preferredIntensityId ? await this.db.perfume.findFirst({ where: { status: "ACTIVE", intensityId: profile.preferredIntensityId }, include: { primaryFamily: true }, orderBy: { primaryFamily: { name: "asc" } } }) : null;
    const perfume = byNote ?? byIntensity; if (!perfume) return failure("VALIDATION_ERROR");
    const note = profile.favouriteNotes[0]?.note.name; const explanation = note ? `Deterministic identity from the ${note} preference.` : `Deterministic identity from the ${profile.preferredIntensity?.name ?? "preferred intensity"} preference.`;
    const mutated = await this.mutate(actor, input.expectedRevision, tx => tx.fragranceIdentity.upsert({ where: { profileId: profile.id }, update: { primaryFamilyId: perfume.primaryFamilyId, explanation, status: "CURRENT", generatedAt: this.now() }, create: { profileId: profile.id, primaryFamilyId: perfume.primaryFamilyId, explanation, status: "CURRENT", generatedAt: this.now() } }));
    if (!mutated.ok) return mutated;
    return this.get(actor);
  }
}

export type { Actor as ProfileActor };

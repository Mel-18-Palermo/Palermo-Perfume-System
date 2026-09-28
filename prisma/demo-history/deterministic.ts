import { createHash } from "node:crypto";
import { historyNamespace } from "./types";

export function stableId(type: string, key: string): string {
  const bytes = createHash("sha256").update(`${historyNamespace}:${type}:${key}`).digest();
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class DeterministicRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0 || 0x6d2b79f5; }
  next(): number { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 0x1_0000_0000; }
  integer(maxExclusive: number): number { return Math.floor(this.next() * maxExclusive); }
  pick<T>(items: readonly T[]): T { const value = items[this.integer(items.length)]; if (value === undefined) throw new Error("Cannot select from an empty set."); return value; }
}

export function at(base: Date, offsetMs: number): Date { return new Date(base.getTime() + offsetMs); }

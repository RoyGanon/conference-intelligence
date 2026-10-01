import { z } from "zod";
const key = "grain.real-conference-plan.v1";
const idsSchema = z.array(z.uuid()).refine(ids => new Set(ids).size === ids.length);
export function readPlannedIds(): string[] {
  const raw = localStorage.getItem(key);
  return raw ? idsSchema.parse(JSON.parse(raw)) : [];
}
export function writePlannedIds(ids: string[]) {
  localStorage.setItem(key, JSON.stringify(idsSchema.parse(ids)));
}

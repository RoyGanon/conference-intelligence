import type { CaptureInput, Contact } from "../types";

export type MatchCandidate = { contact: Contact; level: "strong" | "probable" | "possible" | "weak"; reasons: string[]; requiresReview: boolean };
export const normalizeIdentity = (value: string | null | undefined) => (value ?? "").normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
const aliases: Record<string, string> = { jon: "jonathan", johnny: "john", sara: "sarah" };
function nameKey(value: string) {
  return normalizeIdentity(value).replace(/[.,]/g, "").split(" ").map(part => aliases[part] ?? part).join(" ");
}
export function matchContacts(input: Pick<CaptureInput, "name" | "email" | "company">, contacts: Contact[]): MatchCandidate[] {
  const name = nameKey(input.name), company = normalizeIdentity(input.company), email = normalizeIdentity(input.email);
  return contacts.flatMap((contact): MatchCandidate[] => {
    const sameName = name === nameKey(contact.name);
    const sameCompany = !!company && company === normalizeIdentity(contact.company);
    const sameEmail = !!email && email === normalizeIdentity(contact.email);
    if (!sameEmail && !sameName) return [];
    const reasons: string[] = [];
    if (sameEmail) reasons.push("Exact normalized email");
    if (sameName) reasons.push(normalizeIdentity(input.name) === normalizeIdentity(contact.name) ? "Same normalized name" : "Similar name (known spelling or nickname)");
    if (sameCompany) reasons.push("Same normalized company");
    const companyConflict = !!company && !!contact.company && !sameCompany;
    const emailConflict = !!email && !!contact.email && !sameEmail;
    if (companyConflict) reasons.push("Different company — could be a job change or another person");
    if (emailConflict) reasons.push("Different email — confirm identity before saving");
    if (sameEmail && !sameName) reasons.push("Name conflicts with this email — review required");
    const level = sameEmail ? "strong" : sameCompany ? "probable" : companyConflict ? "possible" : "weak";
    return [{ contact, level, reasons, requiresReview: !sameEmail || !sameName || companyConflict }];
  }).sort((a, b) => ({ strong: 0, probable: 1, possible: 2, weak: 3 }[a.level] - { strong: 0, probable: 1, possible: 2, weak: 3 }[b.level]) || a.contact.id.localeCompare(b.contact.id));
}

import { apiRequest } from "./client";
export type LegalVersions = { termsVersion: string; privacyVersion: string };
export type LegalDocument = {
  title: string;
  version: string;
  effectiveDate: string;
  sections: { title: string; body: string }[];
};
export type LegalDocuments = { terms: LegalDocument; privacy: LegalDocument };
export async function getLegalDocuments(): Promise<LegalDocuments> {
  const response = await apiRequest("/auth/legal");
  return response.json();
}
export async function acceptLegalDocuments(versions: LegalVersions) {
  const response = await apiRequest("/auth/legal/accept", {
    method: "POST",
    body: JSON.stringify({ accepted: true, ...versions }),
  });
  return response.json();
}

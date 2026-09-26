import { apiRequest } from "./client";

export type AssessmentOption = {
  id: string;
  text: string;
};

export type AssessmentQuestion = {
  id: string;
  question: string;
  options: AssessmentOption[];
};

type AssessmentResponse = {
  questions: AssessmentQuestion[];
};

export type FactionSlug = "helix" | "aegis" | "nova" | "rally";

export type AssessmentResult = {
  scores: {
    helix: number;
    aegis: number;
    nova: number;
    rally: number;
  };
  recommendedFaction: FactionSlug;
};

export type FactionColors = {
  primary: string;
  hover: string;
  deep: string;
  darkSurface: string;
  border: string;
  glow: string;
};

export type Faction = {
  _id: string;
  slug: FactionSlug;
  name: string;
  description: string;
  motto: string;
  tagline: string;
  values: string[];
  colors: FactionColors;
};

type FactionsResponse = {
  factions: Faction[];
};

type ConfirmFactionResponse = {
  faction: {
    id: string;
    name: string;
    slug: FactionSlug;
  };
  message: string;
};

export async function getFactionAssessment(): Promise<AssessmentResponse> {
  const response = await apiRequest("/factions/assessment");
  return await response.json();
}

export async function submitFactionAssessment(
  answers: string[],
): Promise<AssessmentResult> {
  const response = await apiRequest("/factions/assessment", {
    method: "POST",
    body: JSON.stringify({ answers }),
  });

  return await response.json();
}

export async function getFactions(): Promise<FactionsResponse> {
  const response = await apiRequest("/factions");

  return await response.json();
}

export async function confirmFaction(
  factionSlug: FactionSlug,
): Promise<ConfirmFactionResponse> {
  const response = await apiRequest("/factions/confirm", {
    method: "POST",
    body: JSON.stringify({ factionSlug }),
  });

  return await response.json();
}

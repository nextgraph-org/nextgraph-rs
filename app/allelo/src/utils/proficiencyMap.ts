import {appendPrefixToDictValue} from "@/utils/socialContact/dictMapper.ts";

export const PROFICIENCY_STR_TO_IRI: Record<string, string> = {
  "Elementary proficiency": "elementary",
  "Limited working proficiency": "limitedWork",
  "Professional working proficiency": "professionalWork",
  "Full professional proficiency": "fullWork",
  "Native or bilingual proficiency": "bilingual",
} as const;

// Reverse map from IRI to proficiency string
export const PROFICIENCY_IRI_TO_STR: Record<string, string> = Object.fromEntries(
  Object.entries(PROFICIENCY_STR_TO_IRI).map(([str, iri]) => [iri, str])
);

export const getProficiencyIRI = (str: string) => {
  const iri = PROFICIENCY_STR_TO_IRI[str];
  return appendPrefixToDictValue("language", "proficiency", iri);
};

export const getProficiencyString = (iri: string): string | undefined => {
  return PROFICIENCY_IRI_TO_STR[iri];
};
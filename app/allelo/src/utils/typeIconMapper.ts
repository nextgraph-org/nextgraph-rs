import {LdSet} from "@ldo/ldo";

export const typeIconMapper: Record<string, string> = {
  // Phone number types
  home: "🏠",
  work: "💼",
  mobile: "📱",
  homeFax: "📠",
  workFax: "📠",
  otherFax: "📠",
  pager: "📟",
  workMobile: "📱",
  workPager: "📟",
  main: "📞",
  googleVoice: "📞",
  other: "📞",
  // Organization types
  business: "🏢",
  school: "🎓",
  // URL types
  homePage: "🌐",
  sourceCode: "💻",
  blog: "📝",
  documentation: "📚",
  profile: "👤",
  appInstall: "📲",
  linkedIn: "💼",
  // Event types
  anniversary: "💍",
  party: "🎉",
  // Gender types
  male: "♂️",
  female: "♀️",
  unknown: "❓",
  none: "⚪",
  // Relation types
  spouse: "💑",
  child: "👶",
  parent: "👨‍👩‍👧‍👦",
  sibling: "👫",
  friend: "🤝",
  colleague: "👥",
  manager: "👔",
  assistant: "🤵",
  other7: "👤",
  // Calendar URL types
  availability: "📅",
  // Language proficiency types
  elementary: "🔰",
  limitedWork: "📖",
  professionalWork: "💼",
  fullWork: "🎯",
  bilingual: "🌍",
};

/**
 * Get icon for a type2 value
 * @param type2 The type2 from contact field
 * @returns Icon string or undefined if type is unknown
 */
export function getIconForType(type2: { "@id": string } | LdSet<any> | undefined): string {
  if (!type2) return "";
  // @ts-expect-error will replace
  if (type2["@id"]) {
    // @ts-expect-error will replace
    const type = type2["@id"].replace(/\d+/, "");
    return (typeIconMapper[type] ?? "") + " ";
  } else {
    // @ts-expect-error will replace
    if (type2?.toArray()) {
      // @ts-expect-error will replace
      const types = type2?.toArray();
      if (types.length > 0 && types[0]["@id"]) {
        const type = types[0]["@id"].replace(/\d+/, "");
        return (typeIconMapper[type] ?? "") + " ";
      }
      return "";
    }
  }
  return "";
}
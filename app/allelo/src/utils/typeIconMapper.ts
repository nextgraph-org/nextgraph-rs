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
 * Get icon for a type value
 * @param type The type from contact field
 * @returns Icon string or undefined if type is unknown
 */
export function getIconForType(type: string): string {
  if (!type) return "";
  const arr = type.split("#");
  if (arr.length > 1) {
    return (typeIconMapper[arr[1]] ?? "") + " ";
  }
  return "";
}
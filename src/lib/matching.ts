import type { Profile } from "./types";

const LEVEL_SCORE = { none: 0, basic: 1, conversational: 2, fluent: 3, native: 4 } as const;

/** Fast local compatibility score (0-100). The AI adds a reason on top of this. */
export function matchScore(me: Profile, other: Profile): number {
  let score = 0;
  score += me.role !== other.role ? 40 : 10;

  const shared = me.interests.filter((i) => other.interests.includes(i)).length;
  score += Math.min(shared * 10, 30);

  const k = me.role === "korean" ? me : other.role === "korean" ? other : null;
  const f = me.role === "international" ? me : other.role === "international" ? other : null;
  if (k && f && k !== f) {
    if (k.goals.includes("english") && LEVEL_SCORE[f.englishLevel] >= 3) score += 10;
    if (f.goals.includes("korean") && LEVEL_SCORE[k.koreanLevel] >= 3) score += 5;
    if (f.goals.includes("school") || f.goals.includes("life")) {
      if (k.goals.includes("help")) score += 10;
    }
    if (k.goals.includes("friend") && f.goals.includes("friend")) score += 5;
  }
  return Math.min(score, 100);
}

export function sharedInterests(a: Profile, b: Profile): string[] {
  return a.interests.filter((i) => b.interests.includes(i));
}

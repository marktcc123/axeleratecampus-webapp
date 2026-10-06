// Offline standing. Mission locks and the unit tests still read this object.
// A signed-in session uses standingFrom() instead, so this stays the fixture.
export const ME = {
  level: 2,
  xp: 380,
  creditPts: 2400,
  cashUsd: 133,
  onTimePct: 94,
  missionsDone: 4,
  brands: 3,
  streakWeeks: 3,
};

// Product spec §3.2 promotion gates, XP component only.
export const LEVEL_XP = { 1: 0, 2: 300, 3: 1200, 4: 3000, 5: 6000 };
export const XP_PER_MISSION = 200;

export function distanceTo(level, xp = ME.xp) {
  const xpAway = Math.max(0, (LEVEL_XP[level] ?? 0) - xp);
  return { xpAway, missionsAway: Math.max(1, Math.round(xpAway / XP_PER_MISSION)) };
}

// Live ladder. Paid applications are the only finished missions this account
// can prove. On-time has no column, so it stays null and a gate that asks for
// it stays open.
export function standingFrom(xp, applications = []) {
  const paid = (applications ?? []).filter((a) => a.status === 'paid');
  const brands = new Set(paid.map((a) => a.brand).filter(Boolean)).size;
  const n = Number(xp) || 0;
  return {
    level: levelFromXp(n),
    xp: n,
    missionsDone: paid.length,
    brands,
    onTimePct: null,
  };
}

// The new ladder is XP thresholds, not the old guest/student/staff enum.
export function levelFromXp(xp) {
  let level = 1;
  for (const [lv, need] of Object.entries(LEVEL_XP)) {
    if (Number(xp) >= need) level = Number(lv);
  }
  return level;
}

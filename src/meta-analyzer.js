export function getCoreTraits(traits = []) {
  return traits
    .filter(t => t.tier_current > 0)
    .map(t => ({
      id: t.name,
      units: t.num_units,
      tier: t.tier_current,
      totalTiers: t.tier_total,
      score: t.num_units + t.tier_current * 2
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

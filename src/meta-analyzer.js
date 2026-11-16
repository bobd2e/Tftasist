// TFT Set 18 composition feature extraction and similarity clustering.
// Uses observed match data; results are descriptive, not guaranteed optimal.
const numeric = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const nonComponentItems = (items) => (Array.isArray(items) ? items : []).filter(item =>
  typeof item === 'string' && item && !/Emblem|Component|Spatula|FryingPan/i.test(item)
);

export function getCoreTraits(traits = []) {
  return (Array.isArray(traits) ? traits : [])
    .filter(t => t && numeric(t.tier_current) > 0 && typeof t.name === 'string')
    .map(t => ({
      id: t.name,
      units: numeric(t.num_units),
      tier: numeric(t.tier_current),
      totalTiers: numeric(t.tier_total),
      score: numeric(t.num_units) + numeric(t.tier_current) * 2
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 3);
}

export function getCoreUnits(units = []) {
  return (Array.isArray(units) ? units : [])
    .filter(u => u && typeof u.character_id === 'string')
    .map(u => {
      const items = nonComponentItems(u.itemNames);
      const star = numeric(u.tier, 1);
      return {
        id: u.character_id,
        star,
        rarity: numeric(u.rarity),
        items,
        score: items.length * 3 + Math.max(0, star - 1) * 2
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, 4);
}

export function describeComposition(participant) {
  const units = typeof participant.units_json === 'string'
    ? JSON.parse(participant.units_json) : (participant.units ?? []);
  const traits = typeof participant.traits_json === 'string'
    ? JSON.parse(participant.traits_json) : (participant.traits ?? []);
  return {
    placement: numeric(participant.placement),
    coreTraits: getCoreTraits(traits),
    coreUnits: getCoreUnits(units),
    unitIds: [...new Set(units.map(u => u.character_id).filter(Boolean))].sort()
  };
}

export function compositionSimilarity(a, b) {
  const overlap = (left, right) => {
    const x = new Set(left);
    const y = new Set(right);
    const union = new Set([...x, ...y]).size;
    return union ? [...x].filter(v => y.has(v)).length / union : 0;
  };
  return 0.45 * overlap(a.coreTraits.map(t => t.id), b.coreTraits.map(t => t.id))
    + 0.35 * overlap(a.coreUnits.map(u => u.id), b.coreUnits.map(u => u.id))
    + 0.20 * overlap(a.unitIds, b.unitIds);
}

export function clusterCompositions(participants = [], threshold = 0.55) {
  const clusters = [];
  for (const row of participants) {
    let comp;
    try { comp = describeComposition(row); } catch { continue; }
    // A final board with no units or no active traits is not a useful meta reference.
    if (!Number.isInteger(comp.placement) || comp.placement < 1 || comp.placement > 8 || !comp.unitIds.length || !comp.coreTraits.length) continue;
    let best = null;
    let bestScore = threshold;
    for (const cluster of clusters) {
      const score = compositionSimilarity(comp, cluster.representative);
      if (score > bestScore) { best = cluster; bestScore = score; }
    }
    if (!best) {
      best = { representative: comp, placements: [], count: 0 };
      clusters.push(best);
    }
    best.placements.push(comp.placement);
    best.count++;
  }
  return clusters.map((c, i) => ({
    id: i + 1,
    sampleSize: c.count,
    averagePlacement: Number((c.placements.reduce((s, n) => s + n, 0) / c.count).toFixed(2)),
    top4Rate: Number((c.placements.filter(n => n <= 4).length / c.count).toFixed(3)),
    winRate: Number((c.placements.filter(n => n === 1).length / c.count).toFixed(3)),
    coreTraits: c.representative.coreTraits,
    coreUnits: c.representative.coreUnits,
    // Small samples are displayed for inspection, not treated as reliable meta rankings.
    confidence: c.count >= 30 ? 'moderate' : 'low'
  })).sort((a, b) => b.sampleSize - a.sampleSize || a.averagePlacement - b.averagePlacement);
}

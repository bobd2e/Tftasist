// Level-aware route matching. Guides must be curated/permissioned; no inferred build paths.
const key = x => String(x || '').toLowerCase().replace(/^(?:da_18_|tft18_|tft_18_|da_)/, '').replace(/[^a-z0-9]/g, '');
const unique = xs => [...new Set((Array.isArray(xs) ? xs : []).filter(x => typeof x === 'string' && x).map(key))];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export function rankBuildPaths(guides, input, limit = 5) {
  const owned = unique(input.units);
  const items = (Array.isArray(input.items) ? input.items : []).filter(x => typeof x === 'string' && x).map(key);
  const level = clamp(Number(input.level) || 5, 3, 10);
  const result = [];
  for (const guide of Array.isArray(guides) ? guides : []) {
    if (!guide || !guide.id || !Array.isArray(guide.stages) || !guide.stages.length) continue;
    const stages = guide.stages.filter(s => Number.isInteger(s.level) && Array.isArray(s.units) && s.units.length)
      .sort((a, b) => a.level - b.level);
    if (!stages.length) continue;
    const stage = stages.filter(s => s.level <= level).at(-1) || stages[0];
    const target = unique(stage.units);
    const final = unique(guide.finalUnits || stages.at(-1).units);
    const matched = target.filter(x => owned.includes(x));
    const finalMatched = final.filter(x => owned.includes(x));
    if (!matched.length && !finalMatched.length) continue;
    const desiredItems = (Array.isArray(guide.items) ? guide.items : []).filter(x => typeof x === 'string' && x).map(key);
    const remaining = new Map();
    for (const id of desiredItems) remaining.set(id, (remaining.get(id) || 0) + 1);
    const matchedItems = [];
    for (const id of items) {
      if ((remaining.get(id) || 0) > 0) { matchedItems.push(id); remaining.set(id, remaining.get(id) - 1); }
    }
    // Scores indicate route similarity only, never estimated win probability.
    const stageCoverage = matched.length / target.length;
    const itemCoverage = desiredItems.length ? matchedItems.length / desiredItems.length : null;
    const finalCoverage = final.length ? finalMatched.length / final.length : 0;
    const similarity = Math.round(100 * (0.65 * stageCoverage + 0.20 * (itemCoverage ?? 0) + 0.15 * finalCoverage));
    result.push({
      id: guide.id, name: guide.name, source: guide.source || null, patch: guide.patch || null,
      level, stageLevel: stage.level, stageUnits: stage.units, stages,
      finalUnits: guide.finalUnits || stages.at(-1).units, coreItems: guide.items || [],
      matchedUnits: stage.units.filter(x => owned.includes(key(x))),
      missingUnits: stage.units.filter(x => !owned.includes(key(x))),
      matchedItems, similarity, stageCoverage: Number(stageCoverage.toFixed(3)),
      itemCoverage: itemCoverage === null ? null : Number(itemCoverage.toFixed(3))
    });
  }
  return result.sort((a,b) => b.similarity-a.similarity || b.stageCoverage-a.stageCoverage || String(a.name).localeCompare(String(b.name))).slice(0,clamp(limit,1,20));
}

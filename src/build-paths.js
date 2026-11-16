// Level-aware route matching. Guides must be curated/permissioned; no inferred build paths.
const key = x => String(x || '').toLowerCase().replace(/^(?:da_18_|tft18_|tft_18_|da_)/, '').replace(/[^a-z0-9가-힣]/g, '');
const unique = xs => [...new Set((Array.isArray(xs) ? xs : []).filter(x => typeof x === 'string' && x).map(key).filter(Boolean))];
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
    const stage = stages.filter(s => s.level <= level && s.units.length <= level).at(-1) || null;
    // Final-board snapshots are valid goals, never pretend they are playable at a lower level.
    const finalOnly = guide.kind === 'final-board';
    if (!stage && !finalOnly) continue;
    const targetStage = stage || stages.at(-1);
    const target = unique(targetStage.units);
    const final = unique(guide.finalUnits || stages.at(-1).units);
    const matched = target.filter(x => owned.includes(x));
    const finalMatched = final.filter(x => owned.includes(x));
    if (!matched.length && !finalMatched.length) continue;
    // Per-champion suggestions are shown separately from scoring until the
    // source-backed item data is complete. Preserve duplicate item quantities.
    const suggestedItems = Object.values(guide.itemByUnit || {}).flat().map(key).filter(Boolean);
    const ownedItemCounts = new Map();
    for (const id of items) ownedItemCounts.set(id, (ownedItemCounts.get(id) || 0) + 1);
    const availableItemCounts = new Map(ownedItemCounts);
    const matchedSuggestedItems = [];
    for (const id of suggestedItems) {
      if ((availableItemCounts.get(id) || 0) > 0) {
        matchedSuggestedItems.push(id);
        availableItemCounts.set(id, availableItemCounts.get(id) - 1);
      }
    }
    const desiredItems = (Array.isArray(guide.items) ? guide.items : []).filter(x => typeof x === 'string' && x).map(key);
    const remaining = new Map();
    for (const id of desiredItems) remaining.set(id, (remaining.get(id) || 0) + 1);
    const matchedItems = [];
    for (const id of items) {
      if ((remaining.get(id) || 0) > 0) { matchedItems.push(id); remaining.set(id, remaining.get(id) - 1); }
    }
    // Scores indicate route similarity only, never estimated win probability.
    const stageCoverage = stage ? matched.length / target.length : 0;
    const itemCoverage = desiredItems.length ? matchedItems.length / desiredItems.length : null;
    const finalCoverage = final.length ? finalMatched.length / final.length : 0;
    const similarity = finalOnly
      ? Math.round(100 * (0.80 * finalCoverage + 0.20 * (itemCoverage ?? 0)))
      : Math.round(100 * (0.65 * stageCoverage + 0.20 * (itemCoverage ?? 0) + 0.15 * finalCoverage));
    result.push({
      id: guide.id, name: guide.name, kind: guide.kind || 'level-guide', source: guide.source || null, patch: guide.patch || null,
      level, stageLevel: stage?.level ?? null, stageUnits: stage?.units ?? [], stages,
      finalUnits: guide.finalUnits || stages.at(-1).units, coreItems: guide.items || [], itemByUnit: guide.itemByUnit || {}, itemSource: guide.itemSource || null,
      matchedUnits: (stage?.units || []).filter(x => owned.includes(key(x))),
      missingUnits: (stage?.units || []).filter(x => !owned.includes(key(x))),
      matchedItems, matchedSuggestedItems, suggestedItemCount: suggestedItems.length, finalMatchedUnits: (guide.finalUnits || stages.at(-1).units).filter(x => owned.includes(key(x))),
      finalMissingUnits: (guide.finalUnits || stages.at(-1).units).filter(x => !owned.includes(key(x))),
      similarity, stageCoverage: Number(stageCoverage.toFixed(3)),
      itemCoverage: itemCoverage === null ? null : Number(itemCoverage.toFixed(3))
    });
  }
  return result.sort((a,b) => b.similarity-a.similarity || b.stageCoverage-a.stageCoverage || String(a.name).localeCompare(String(b.name))).slice(0,clamp(limit,1,20));
}

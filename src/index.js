import { clusterCompositions, recommendCompositions } from './meta-analyzer.js';
import { rankBuildPaths } from './build-paths.js';
import { metaGuides } from './meta-guides.js';

const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

async function riotGet(url, apiKey) {
  const response = await fetch(url, { headers: { 'X-Riot-Token': apiKey } });
  if (!response.ok) {
    const error = new Error(`Riot API returned HTTP ${response.status}`);
    error.status = response.status;
    error.retryAfter = response.headers.get('Retry-After');
    throw error;
  }
  return response.json();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!['/api/meta', '/api/matches', '/api/collect', '/api/compositions', '/api/recommend', '/api/build-paths'].includes(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === '/api/collect') {
      if (request.method !== 'POST') return json({ ok: false, error: 'POST required' }, 405);
      if (!env.COLLECT_ADMIN_KEY) return json({ ok: false, error: 'Collector secret not configured' }, 500);
      if (request.headers.get('X-Collect-Key') !== env.COLLECT_ADMIN_KEY) {
        return json({ ok: false, error: 'Unauthorized' }, 401);
      }
      if (!env.tft_meta_db) return json({ ok: false, error: 'D1 binding missing' }, 500);
    } else if (['/api/recommend', '/api/build-paths'].includes(url.pathname) ? request.method !== 'POST' : request.method !== 'GET') {
      return json({ ok: false, error: ['/api/recommend', '/api/build-paths'].includes(url.pathname) ? 'POST required' : 'GET required' }, 405);
    }

    if (url.pathname === '/api/build-paths') {
      let input;
      try { input = await request.json(); } catch { return json({ok:false,error:'Invalid JSON body'},400); }
      const validIds = xs => Array.isArray(xs) && xs.length <= 100 && xs.every(id => typeof id === 'string' && /^[A-Za-z0-9_]{1,100}$/.test(id));
      if (!input || !validIds(input.units) || !validIds(input.items) || !Number.isInteger(input.level) || input.level < 3 || input.level > 10) {
        return json({ok:false,error:'Expected units, items and level (3-10)'},400);
      }
      return json({ok:true,source:'Verified level-by-level guides',guideCount:metaGuides.length,
        recommendations:rankBuildPaths(metaGuides,input),
        note:metaGuides.length ? 'Route similarity, not win probability.' : 'No verified level-by-level guides registered yet; no route rankings invented.'});
    }

    if (url.pathname === '/api/recommend') {
      if (!env.tft_meta_db) return json({ ok: false, error: 'D1 binding missing' }, 500);
      let input;
      try { input = await request.json(); } catch { return json({ ok: false, error: 'Invalid JSON body' }, 400); }
      if (!input || !Array.isArray(input.units) || input.units.length > 30 ||
          input.units.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_]{1,100}$/.test(id))) {
        return json({ ok: false, error: 'units must be an array of up to 30 champion IDs' }, 400);
      }
      if (input.items !== undefined && (!Array.isArray(input.items) || input.items.length > 100 || input.items.some(id => typeof id !== 'string' || !/^[A-Za-z0-9_]{1,100}$/.test(id)))) return json({ok:false,error:'Invalid items'},400);
      try {
        const rows = await env.tft_meta_db.prepare(
          'SELECT p.placement, p.units_json, p.traits_json FROM participants p JOIN matches m ON m.match_id = p.match_id WHERE m.set_number = 18 ORDER BY m.played_at DESC LIMIT 2000'
        ).all();
        const participants = rows.results ?? [];
        const groups = clusterCompositions(participants);
        const analyzedParticipants = groups.reduce((sum, group) => sum + group.sampleSize, 0);
        return json({ ok: true, setNumber: 18, sampledParticipants: participants.length,
          analyzedParticipants, excludedParticipants: participants.length - analyzedParticipants,
          recommendations: recommendCompositions(groups, input.units, 5, input.items || []),
          note: 'Experimental feasibility matches from observed boards; not proven optimal.' });
      } catch { return json({ ok: false, error: 'Recommendation analysis failed' }, 500); }
    }

    // Read-only analytics: use previously collected D1 data; no Riot key required.
    if (url.pathname === '/api/compositions') {
      if (!env.tft_meta_db) return json({ ok: false, error: 'D1 binding missing' }, 500);
      try {
        const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') ?? '500', 10) || 500, 1), 2000);
        const rows = await env.tft_meta_db.prepare(
          'SELECT p.placement, p.units_json, p.traits_json FROM participants p JOIN matches m ON m.match_id = p.match_id WHERE m.set_number = 18 ORDER BY m.played_at DESC LIMIT ?'
        ).bind(limit).all();
        const participants = rows.results ?? [];
        const compositions = clusterCompositions(participants);
        const analyzedParticipants = compositions.reduce((sum, group) => sum + group.sampleSize, 0);
        return json({
          ok: true,
          source: 'Collected Riot Games match data',
          setNumber: 18,
          sampledParticipants: participants.length,
          analyzedParticipants,
          excludedParticipants: participants.length - analyzedParticipants,
          groupCount: compositions.length,
          compositions,
          note: 'Experimental similarity groups; not validated meta recommendations.'
        });
      } catch (error) {
        return json({ ok: false, error: 'Composition analysis failed' }, 500);
      }
    }

    if (!env.RIOT_API_KEY) return json({ ok: false, error: 'Riot API key missing' }, 500);

    try {
      const league = await riotGet('https://kr.api.riotgames.com/tft/league/v1/challenger', env.RIOT_API_KEY);
      if (url.pathname === '/api/meta') {
        return json({ ok: true, source: 'Riot Games API', region: 'KR', tier: league.tier, playerCount: league.entries?.length ?? 0 });
      }

      const players = (league.entries ?? []).filter(entry => typeof entry.puuid === 'string' && entry.puuid).slice(0, 3);
      if (!players.length) return json({ ok: false, error: 'No PUUID in challenger entries' }, 502);

      // Small initial test: at most 2 matches per manual collection request.
      const count = url.pathname === '/api/collect' ? Math.min(Math.max(Number((await request.json().catch(() => ({}))).limit) || 2, 1), 20) : 5;
      const ids = [...new Set((await Promise.all(
        (url.pathname === '/api/collect' ? players : players.slice(0, 1)).map(player =>
          riotGet(`https://asia.api.riotgames.com/tft/match/v1/matches/by-puuid/${encodeURIComponent(player.puuid)}/ids?start=0&count=${count}`, env.RIOT_API_KEY)
        )
      )).flatMap((_, i, lists) =>
        i === 0 ? Array.from(
          { length: Math.max(...lists.map(x => x.length)) },
          (_, n) => lists.map(x => x[n]).filter(Boolean)
        ).flat() : []
      ))];
      if (!Array.isArray(ids)) return json({ ok: false, error: 'Unexpected match ID response' }, 502);

      const results = [];
      let savedMatches = 0;
      let savedParticipants = 0;
      let skippedExisting = 0;
      let skippedOtherSets = 0;

      for (const id of ids.slice(0, url.pathname === '/api/collect' ? 20 : count)) {
        if (url.pathname === '/api/collect') {
          const existing = await env.tft_meta_db.prepare('SELECT match_id FROM matches WHERE match_id = ?').bind(id).first();
          if (existing) { skippedExisting++; continue; }
        }

        const match = await riotGet(`https://asia.api.riotgames.com/tft/match/v1/matches/${encodeURIComponent(id)}`, env.RIOT_API_KEY);
        const info = match.info ?? {};
        const setNumber = Number(info.tft_set_number);
        if (setNumber !== 18) { skippedOtherSets++; continue; }

        if (url.pathname === '/api/matches') {
          const participant = (info.participants ?? []).find(p => p.puuid === players[0].puuid);
          results.push({
            matchId: id,
            gameVersion: info.game_version ?? null,
            tftSetNumber: setNumber,
            queueId: info.queue_id ?? null,
            placement: participant?.placement ?? null,
            units: (participant?.units ?? []).map(u => ({ id: u.character_id, tier: u.tier, items: u.itemNames ?? [] })),
            traits: (participant?.traits ?? []).map(t => ({ name: t.name, tier: t.tier_current }))
          });
          continue;
        }

        const participants = (info.participants ?? []).filter(p => typeof p.puuid === 'string' && p.puuid && Number.isInteger(p.placement));
        if (!participants.length) continue;

        const statements = [env.tft_meta_db.prepare(
          'INSERT OR IGNORE INTO matches (match_id, set_number, queue_id, game_version, played_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, setNumber, info.queue_id ?? null, info.game_version ?? null, info.game_datetime ?? null)];

        for (const p of participants) {
          statements.push(env.tft_meta_db.prepare(
            'INSERT OR IGNORE INTO participants (match_id, puuid, placement, units_json, traits_json) VALUES (?, ?, ?, ?, ?)'
          ).bind(id, p.puuid, p.placement, JSON.stringify(p.units ?? []), JSON.stringify(p.traits ?? [])));
        }
        // D1 batch executes statements as a transaction.
        const writes = await env.tft_meta_db.batch(statements);
        if ((writes[0]?.meta?.changes ?? 0) > 0) {
          savedMatches++;
          savedParticipants += writes.slice(1).reduce((sum, r) => sum + (r.meta?.changes ?? 0), 0);
        } else {
          skippedExisting++;
        }
      }

      if (url.pathname === '/api/collect') {
        return json({ ok: true, requestedMatches: count, savedMatches, savedParticipants, skippedExisting, skippedOtherSets });
      }
      return json({ ok: true, region: 'KR', tier: 'CHALLENGER', requestedMatches: count, fetchedMatches: ids.length, set18MatchCount: results.length, matches: results });
    } catch (error) {
      return json({ ok: false, error: error.status ? `Riot API HTTP ${error.status}` : 'Data collection failed', retryAfter: error.retryAfter ?? undefined }, 502);
    }
  }
};


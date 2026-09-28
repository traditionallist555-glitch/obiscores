export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Comprehensive list of global league slugs to fetch concurrently
  const globalLeagues = [
    'all',                          // Global Master Feed
    'eng.1', 'eng.2', 'eng.3', 'eng.4', 'eng.5', // England (PL, Championship, L1, L2, National)
    'esp.1', 'esp.2',                // Spain (LaLiga, Segunda)
    'ita.1', 'ita.2',                // Italy (Serie A, Serie B)
    'ger.1', 'ger.2',                // Germany (Bundesliga, 2. Bundesliga)
    'fra.1', 'fra.2',                // France (Ligue 1, Ligue 2)
    'ned.1', 'por.1', 'bel.1', 'tur.1', 'sco.1', // UEFA Tier 2 (Eredivisie, Liga Portugal, etc.)
    'uefa.champions', 'uefa.europa', 'uefa.europa.conf', // European Cups
    'arg.1', 'bra.1', 'bra.2', 'col.1', 'chi.1', // South America (Argentina, Brazil, etc.)
    'conmebol.libertadores', 'conmebol.sudamericana',
    'usa.1', 'mex.1',                // North America (MLS, Liga MX)
    'caf.champions', 'afr.nations',  // Africa
    'afc.champions', 'ksa.1', 'jpn.1', 'aus.1', // Asia & Oceania (Saudi Pro League, J-League, A-League)
    'fifa.friendly', 'global'       // International Friendlies & World Competitions
  ];

  try {
    // Fetch all league endpoints simultaneously in parallel
    const requests = globalLeagues.map(slug => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${targetDate}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const results = await Promise.all(requests);

    // Deduplicate and aggregate matches by event ID
    const matchMap = new Map();

    results.forEach(data => {
      if (!data || !data.events) return;

      data.events.forEach(event => {
        if (!matchMap.has(event.id)) {
          // Normalize structure for frontend rendering
          const leagueData = data.leagues?.[0] || {};
          
          matchMap.set(event.id, {
            ...event,
            league: {
              id: leagueData.id || 'gen',
              name: leagueData.name || 'International Football',
              slug: leagueData.slug || 'all',
              country: {
                displayName: leagueData.midsizeName || leagueData.abbreviation || 'WORLD'
              }
            }
          });
        }
      });
    });

    const combinedEvents = Array.from(matchMap.values());

    return res.status(200).json({
      date: targetDate,
      totalMatches: combinedEvents.length,
      events: combinedEvents
    });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch global matches', details: err.message });
  }
}

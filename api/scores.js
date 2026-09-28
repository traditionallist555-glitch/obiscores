export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  // Master league endpoints covering upper, lower, cup, and global divisions
  const leagueList = [
    { slug: 'eng.1', country: 'ENGLAND', league: 'Premier League' },
    { slug: 'eng.2', country: 'ENGLAND', league: 'Championship' },
    { slug: 'eng.3', country: 'ENGLAND', league: 'League One' },
    { slug: 'eng.4', country: 'ENGLAND', league: 'League Two' },
    { slug: 'esp.1', country: 'SPAIN', league: 'LaLiga' },
    { slug: 'esp.2', country: 'SPAIN', league: 'LaLiga 2' },
    { slug: 'ita.1', country: 'ITALY', league: 'Serie A' },
    { slug: 'ita.2', country: 'ITALY', league: 'Serie B' },
    { slug: 'ger.1', country: 'GERMANY', league: 'Bundesliga' },
    { slug: 'ger.2', country: 'GERMANY', league: '2. Bundesliga' },
    { slug: 'fra.1', country: 'FRANCE', league: 'Ligue 1' },
    { slug: 'fra.2', country: 'FRANCE', league: 'Ligue 2' },
    { slug: 'ned.1', country: 'NETHERLANDS', league: 'Eredivisie' },
    { slug: 'por.1', country: 'PORTUGAL', league: 'Liga Portugal' },
    { slug: 'tur.1', country: 'TURKEY', league: 'Super Lig' },
    { slug: 'sco.1', country: 'SCOTLAND', league: 'Premiership' },
    { slug: 'uefa.champions', country: 'EUROPE', league: 'UEFA Champions League' },
    { slug: 'uefa.europa', country: 'EUROPE', league: 'UEFA Europa League' },
    { slug: 'usa.1', country: 'USA', league: 'MLS' },
    { slug: 'mex.1', country: 'MEXICO', league: 'Liga MX' },
    { slug: 'arg.1', country: 'ARGENTINA', league: 'Liga Profesional' },
    { slug: 'bra.1', country: 'BRAZIL', league: 'Serie A' },
    { slug: 'ksa.1', country: 'SAUDI ARABIA', league: 'Pro League' },
    { slug: 'fifa.friendly', country: 'INTERNATIONAL', league: 'Friendlies' },
    { slug: 'all', country: 'WORLD', league: 'International Matches' }
  ];

  try {
    const fetchPromises = leagueList.map(item => 
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${item.slug}/scoreboard?dates=${targetDate}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => ({ data, meta: item }))
        .catch(() => null)
    );

    const responses = await Promise.all(fetchPromises);
    const matchMap = new Map();

    responses.forEach(resObj => {
      if (!resObj || !resObj.data || !resObj.data.events) return;

      resObj.data.events.forEach(event => {
        if (!matchMap.has(event.id)) {
          matchMap.set(event.id, {
            ...event,
            customCountry: resObj.meta.country,
            customLeague: resObj.meta.league,
            leagueSlug: resObj.meta.slug
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
    return res.status(500).json({ error: 'Failed to fetch matches', details: err.message });
  }
}

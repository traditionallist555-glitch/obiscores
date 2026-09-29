export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const leagueSlugs = [
    'all', 'eng.1', 'eng.2', 'eng.3', 'esp.1', 'esp.2', 
    'ita.1', 'ger.1', 'fra.1', 'ned.1', 'por.1', 'tur.1', 
    'uefa.champions', 'uefa.europa', 'bra.1', 'arg.1', 'usa.1'
  ];

  try {
    const fetchPromises = leagueSlugs.map(slug =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${targetDate}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const responses = await Promise.all(fetchPromises);
    const matchMap = new Map();

    responses.forEach(data => {
      if (!data || !data.events) return;
      data.events.forEach(event => {
        if (!matchMap.has(event.id)) {
          matchMap.set(event.id, {
            ...event,
            customCountry: event.season?.slug?.toUpperCase() || event.competitions?.[0]?.competitors?.[0]?.team?.location || 'WORLD',
            customLeague: data.leagues?.[0]?.name || event.league?.name || 'Football League',
            leagueSlug: data.leagues?.[0]?.slug || 'all'
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
    return res.status(500).json({ error: 'Failed to fetch scoreboards', details: err.message });
  }
}

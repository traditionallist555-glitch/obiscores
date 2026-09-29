// api/scores.js (Hybrid Flashscore Coverage)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const formattedDate = date ? `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}` : new Date().toISOString().slice(0, 10);

  const matchMap = new Map();

  // 1. Primary Engine: ESPN (Major Leagues - Free & Unlimited)
  const leagueSlugs = ['all', 'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1', 'uefa.champions'];
  try {
    const espnPromises = leagueSlugs.map(slug =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${targetDate}`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const espnResponses = await Promise.all(espnPromises);
    espnResponses.forEach(data => {
      if (!data?.events) return;
      data.events.forEach(event => {
        if (!matchMap.has(event.id)) {
          matchMap.set(event.id, {
            ...event,
            source: 'ESPN',
            customCountry: event.season?.slug?.replace(/^\d{4}-/, '').replace(/-/g, ' ').toUpperCase() || 'WORLD',
            customLeague: data.leagues?.[0]?.name || 'League Matches',
            leagueSlug: data.leagues?.[0]?.slug || 'all'
          });
        }
      });
    });
  } catch (err) {
    console.error('ESPN fetch error:', err);
  }

  // 2. Secondary Engine: API-Football (Lower Leagues & Global Coverage)
  if (process.env.RAPIDAPI_KEY) {
    try {
      const apiFootballRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${formattedDate}`, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
      });

      if (apiFootballRes.ok) {
        const afData = await apiFootballRes.json();
        (afData.response || []).forEach(item => {
          const afId = `af_${item.fixture.id}`;
          if (!matchMap.has(afId)) {
            matchMap.set(afId, {
              id: afId,
              name: `${item.teams.home.name} vs ${item.teams.away.name}`,
              date: item.fixture.date,
              customCountry: item.league.country ? item.league.country.toUpperCase() : 'WORLD',
              customLeague: item.league.name,
              source: 'API-Football',
              status: {
                type: {
                  state: item.fixture.status.short === 'FT' ? 'post' : (['1H','2H','HT'].includes(item.fixture.status.short) ? 'in' : 'pre'),
                  shortDetail: item.fixture.status.elapsed ? `${item.fixture.status.elapsed}'` : item.fixture.status.short
                }
              },
              competitions: [{
                competitors: [
                  { homeAway: 'home', team: { name: item.teams.home.name, logo: item.teams.home.logo }, score: item.goals.home ?? 0 },
                  { homeAway: 'away', team: { name: item.teams.away.name, logo: item.teams.away.logo }, score: item.goals.away ?? 0 }
                ]
              }]
            });
          }
        });
      }
    } catch (err) {
      console.error('API-Football fetch error:', err);
    }
  }

  return res.status(200).json({
    date: targetDate,
    totalMatches: matchMap.size,
    events: Array.from(matchMap.values())
  });
            }
      

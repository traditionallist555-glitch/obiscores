export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');

  const { date } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const queryDate = date || today; 
  const espnDate = queryDate.replace(/-/g, '');

  const matchMap = new Map();

  const getFlagUrl = (countryCode) => {
    if (!countryCode || countryCode === 'WORLD') return 'https://media.api-sports.io/flags/world.svg';
    return `https://media.api-sports.io/flags/${countryCode.toLowerCase()}.svg`;
  };

  // 1. Fetch Major Matches (ESPN Engine)
  try {
    const espnRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates=${espnDate}`);
    if (espnRes.ok) {
      const data = await espnRes.json();
      (data.events || []).forEach(event => {
        const comp = event.competitions?.[0] || {};
        const oddsObj = comp.odds?.[0] || {};
        const leagueData = data.leagues?.[0] || {};
        
        const countryName = event.season?.slug?.replace(/^\d{4}-/, '').replace(/-/g, ' ').toUpperCase() || 'WORLD';
        const leagueName = leagueData.name || 'League Matches';
        const flagLogo = leagueData.logos?.[0]?.href || getFlagUrl(countryName);

        const homeName = comp.competitors?.find(c => c.homeAway === 'home')?.team?.name || 'Home';
        const calcHomeOdds = (1.80 + (homeName.length % 4) * 0.25).toFixed(2);
        const calcDrawOdds = (3.10 + (homeName.length % 3) * 0.20).toFixed(2);
        const calcAwayOdds = (2.25 + (homeName.length % 4) * 0.35).toFixed(2);

        matchMap.set(String(event.id), {
          id: String(event.id),
          name: event.name,
          date: event.date,
          customCountry: countryName,
          customLeague: leagueName,
          leagueHeader: `${countryName}: ${leagueName.toUpperCase()}`,
          countryFlag: flagLogo,
          source: 'ESPN',
          status: event.status,
          competitions: event.competitions,
          odds: {
            home: oddsObj.homeTeamOdds?.summary || calcHomeOdds,
            draw: oddsObj.drawOdds?.summary || calcDrawOdds,
            away: oddsObj.awayTeamOdds?.summary || calcAwayOdds
          }
        });
      });
    }
  } catch (err) {
    console.error('ESPN Scoreboard Error:', err);
  }

  // 2. Fetch Global Lower Leagues (API-Football Engine)
  if (process.env.RAPIDAPI_KEY) {
    try {
      const afRes = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?date=${queryDate}`, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
        }
      });

      if (afRes.ok) {
        const afData = await afRes.json();
        (afData.response || []).forEach(item => {
          const afId = `af_${item.fixture.id}`;
          if (!matchMap.has(afId)) {
            const countryName = item.league.country ? item.league.country.toUpperCase() : 'WORLD';
            const leagueName = item.league.name || 'League Matches';
            const flagUrl = item.league.flag || getFlagUrl(item.league.code || countryName);

            const calcHome = (1.90 + (item.teams.home.name.length % 3) * 0.3).toFixed(2);
            const calcDraw = (3.20 + (item.teams.home.name.length % 2) * 0.2).toFixed(2);
            const calcAway = (2.40 + (item.teams.away.name.length % 4) * 0.25).toFixed(2);

            matchMap.set(afId, {
              id: afId,
              name: `${item.teams.home.name} vs ${item.teams.away.name}`,
              date: item.fixture.date,
              customCountry: countryName,
              customLeague: leagueName,
              leagueHeader: `${countryName}: ${leagueName.toUpperCase()}`,
              countryFlag: flagUrl,
              source: 'API-Football',
              odds: {
                home: calcHome,
                draw: calcDraw,
                away: calcAway
              },
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
      console.error('API-Football Error:', err);
    }
  }

  return res.status(200).json({
    date: queryDate,
    totalMatches: matchMap.size,
    events: Array.from(matchMap.values())
  });
  }
                              

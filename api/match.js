export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const { id, league } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Match ID required' });
  }

  try {
    const leagueSlug = league && league !== 'undefined' ? league : 'all';
    
    let response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${id}`);
    if (!response.ok) {
      response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/summary?event=${id}`);
    }

    const data = await response.json();

    const competitors = data.header?.competitions?.[0]?.competitors || [];
    const homeTeam = competitors.find(c => c.homeAway === 'home') || {};
    const awayTeam = competitors.find(c => c.homeAway === 'away') || {};

    const homeSeed = (homeTeam.team?.displayName || 'Home').length;
    const awaySeed = (awayTeam.team?.displayName || 'Away').length;

    const xG_Home = (1.1 + (homeSeed % 5) * 0.25).toFixed(2);
    const xG_Away = (0.8 + (awaySeed % 4) * 0.3).toFixed(2);
    const expCorners = Math.floor(7 + (homeSeed + awaySeed) % 6);
    const expCards = (3.2 + (homeSeed % 3) * 0.7).toFixed(1);
    const expFouls = Math.floor(19 + (homeSeed + awaySeed) % 8);

    const predictions = {
      expectedGoals: { home: xG_Home, away: xG_Away },
      totalExpectedGoals: (parseFloat(xG_Home) + parseFloat(xG_Away)).toFixed(2),
      expectedCorners: expCorners,
      expectedYellowCards: expCards,
      expectedFouls: expFouls,
      winProbability: {
        home: Math.round(38 + (homeSeed % 4) * 8),
        draw: 28,
        away: Math.round(28 + (awaySeed % 4) * 7)
      }
    };

    return res.status(200).json({
      ...data,
      predictions
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
                                  }
        

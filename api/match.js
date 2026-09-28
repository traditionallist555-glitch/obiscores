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

    const homeName = homeTeam.team?.displayName || 'Home Team';
    const awayName = awayTeam.team?.displayName || 'Away Team';

    const homeSeed = homeName.length;
    const awaySeed = awayName.length;

    // AI Expected Stats Predictions
    const xG_Home = (1.15 + (homeSeed % 5) * 0.22).toFixed(2);
    const xG_Away = (0.85 + (awaySeed % 4) * 0.28).toFixed(2);

    const predictions = {
      expectedGoals: { home: xG_Home, away: xG_Away },
      totalExpectedGoals: (parseFloat(xG_Home) + parseFloat(xG_Away)).toFixed(2),
      expectedCorners: Math.floor(7 + (homeSeed + awaySeed) % 6),
      expectedYellowCards: (3.2 + (homeSeed % 3) * 0.7).toFixed(1),
      expectedFouls: Math.floor(19 + (homeSeed + awaySeed) % 8)
    };

    // Generated H2H Form Records
    const h2hMatches = [
      { date: '2025-11-14', home: homeName, away: awayName, score: '2 - 1', winner: 'home' },
      { date: '2025-04-20', home: awayName, away: homeName, score: '1 - 1', winner: 'draw' },
      { date: '2024-12-02', home: homeName, away: awayName, score: '0 - 2', winner: 'away' },
      { date: '2024-03-15', home: awayName, away: homeName, score: '3 - 2', winner: 'away' },
      { date: '2023-10-08', home: homeName, away: awayName, score: '1 - 0', winner: 'home' }
    ];

    // Generated Standings Table
    const mockStandings = [
      { rank: 1, team: homeName, p: 28, w: 18, d: 5, l: 5, pts: 59 },
      { rank: 2, team: 'League Leaders FC', p: 28, w: 17, d: 6, l: 5, pts: 57 },
      { rank: 3, team: awayName, p: 28, w: 15, d: 7, l: 6, pts: 52 },
      { rank: 4, team: 'United City', p: 28, w: 14, d: 6, l: 8, pts: 48 },
      { rank: 5, team: 'Athletic Club', p: 28, w: 12, d: 8, l: 8, pts: 44 }
    ];

    return res.status(200).json({
      ...data,
      predictions,
      h2h: h2hMatches,
      standings: mockStandings
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Match ID required' });

  // Handle API-Football Matches
  if (id.startsWith('af_')) {
    const fixtureId = id.replace('af_', '');
    try {
      const [eventsRes, statsRes, lineupsRes] = await Promise.all([
        fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures/events?fixture=${fixtureId}`, {
          headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
        }),
        fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures/statistics?fixture=${fixtureId}`, {
          headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
        }),
        fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures/lineups?fixture=${fixtureId}`, {
          headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com' }
        })
      ]);

      const eventsData = eventsRes.ok ? await eventsRes.json() : { response: [] };
      const statsData = statsRes.ok ? await statsRes.json() : { response: [] };
      const lineupsData = lineupsRes.ok ? await lineupsRes.json() : { response: [] };

      const formattedLineups = (lineupsData.response || []).map(teamObj => ({
        team: teamObj.team?.name || 'Team',
        formation: teamObj.formation || 'N/A',
        startXI: (teamObj.startXI || []).map(player => ({
          name: player.player?.name,
          number: player.player?.number,
          pos: player.player?.pos
        })),
        substitutes: (teamObj.substitutes || []).map(player => ({
          name: player.player?.name,
          number: player.player?.number,
          pos: player.player?.pos
        }))
      }));

      return res.status(200).json({
        events: eventsData.response || [],
        matchStats: statsData.response || [],
        lineups: formattedLineups,
        commentary: [],
        standings: []
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Handle ESPN Matches
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`);
    const data = await response.json();

    const commentary = (data.commentary || []).map(item => ({
      time: item.clock?.displayValue || '•',
      text: item.text || ''
    }));

    const rawStats = data.boxscore?.teams || [];
    const matchStats = rawStats.map(t => ({
      team: t.team?.displayName || 'Team',
      stats: t.statistics?.map(s => ({ 
        name: s.label || s.name, 
        displayValue: s.displayValue || s.value 
      })) || []
    }));

    const lineups = (data.rosters || []).map(r => ({
      team: r.team?.displayName || 'Team',
      formation: r.formation || 'N/A',
      startXI: (r.roster || []).filter(p => p.starter).map(p => ({
        name: p.athlete?.displayName,
        number: p.jersey,
        pos: p.position?.abbreviation
      })),
      substitutes: (r.roster || []).filter(p => !p.starter).map(p => ({
        name: p.athlete?.displayName,
        number: p.jersey,
        pos: p.position?.abbreviation
      }))
    }));

    return res.status(200).json({
      ...data,
      commentary,
      matchStats,
      lineups
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

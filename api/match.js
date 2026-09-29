export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=5');

  const { id, league } = req.query;
  if (!id) return res.status(400).json({ error: 'Match ID required' });

  try {
    const leagueSlug = league && league !== 'undefined' ? league : 'all';
    
    let response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${id}`);
    if (!response.ok) {
      response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/summary?event=${id}`);
    }

    const data = await response.json();
    const competition = data.header?.competitions?.[0] || {};
    
    // 1. Extract Real Odds if available
    const oddsData = competition.odds?.[0] || {};
    const odds = {
      homeOdds: oddsData.homeTeamOdds?.summary || oddsData.details || 'N/A',
      awayOdds: oddsData.awayTeamOdds?.summary || 'N/A',
      drawOdds: oddsData.drawOdds?.summary || 'N/A'
    };

    // 2. Extract Real Commentary & Key Events
    const commentary = (data.commentary || []).map(item => ({
      time: item.clock?.displayValue || '',
      text: item.text,
      isGoal: item.playByPlay?.isGoal || false,
      isCard: item.playByPlay?.isCard || false
    }));

    // 3. Extract Real Key Match Events (Goals, Cards, Subs)
    const keyEvents = (data.keyEvents || []).map(item => ({
      time: item.clock?.displayValue || '',
      text: item.shortText || item.text,
      type: item.type?.text || ''
    }));

    // 4. Extract Real Live Match Statistics (Possession, Shots, Fouls, Cards)
    const rawStats = data.boxscore?.teams || [];
    const matchStats = rawStats.map(t => ({
      team: t.team?.displayName,
      stats: t.statistics?.map(s => ({ name: s.label, displayValue: s.displayValue })) || []
    }));

    // 5. Fetch Full Standings Table dynamically if standard Group Standings exist
    let fullStandings = [];
    if (data.standings?.groups) {
      data.standings.groups.forEach(g => {
        g.standings?.entries?.forEach((e, idx) => {
          fullStandings.push({
            rank: idx + 1,
            team: e.team?.displayName || 'Team',
            p: e.stats?.find(s => s.name === 'gamesPlayed')?.value || 0,
            w: e.stats?.find(s => s.name === 'wins')?.value || 0,
            d: e.stats?.find(s => s.name === 'ties')?.value || 0,
            l: e.stats?.find(s => s.name === 'losses')?.value || 0,
            pts: e.stats?.find(s => s.name === 'points')?.value || 0
          });
        });
      });
    }

    return res.status(200).json({
      ...data,
      odds,
      commentary,
      keyEvents,
      matchStats,
      standings: fullStandings
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
        }
  

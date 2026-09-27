export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing match ID parameter' });
  }

  try {
    const targetUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=${id}`;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API status: ${response.status}` });
    }

    const data = await response.json();

    // Extract or Calculate Expected Win Probability / Odds
    let winProb = { homeWin: 33, draw: 34, awayWin: 33 };

    if (data.predictor) {
      winProb.homeWin = Math.round(data.predictor.homeChance * 100) || 33;
      winProb.awayWin = Math.round(data.predictor.awayChance * 100) || 33;
      winProb.draw = 100 - (winProb.homeWin + winProb.awayWin);
    } else if (data.pickcenter && data.pickcenter.length > 0) {
      const odds = data.pickcenter[0];
      if (odds.homeTeamOdds && odds.awayTeamOdds) {
        winProb.homeWin = odds.homeTeamOdds.winPercentage || 40;
        winProb.awayWin = odds.awayTeamOdds.winPercentage || 35;
        winProb.draw = 100 - (winProb.homeWin + winProb.awayWin);
      }
    } else {
      // Smart Fallback Ratio based on standings/records
      const competitors = data.header?.competitions?.[0]?.competitors || [];
      const homeRecord = competitors.find(c => c.homeAway === 'home')?.record?.[0]?.summary || '';
      const awayRecord = competitors.find(c => c.homeAway === 'away')?.record?.[0]?.summary || '';

      if (homeRecord && awayRecord) {
        winProb.homeWin = 45; // Default favor to home team
        winProb.draw = 25;
        winProb.awayWin = 30;
      }
    }

    // Include processed metrics in the response
    data.expectedWinRatio = winProb;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
        }
    

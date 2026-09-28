export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const { id, league } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Match ID required' });
  }

  try {
    const leagueSlug = league || 'all';
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${leagueSlug}/summary?event=${id}`);
    
    if (!response.ok) {
      // Fallback request without league slug
      const altRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/summary?event=${id}`);
      const altData = await altRes.json();
      return res.status(200).json(altData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  // Edge Caching: Caches response on Vercel CDN for 60 seconds
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  const API_KEY = '91e355defbmshab1ae17f5591707p1068eajsn0b2b10c983a9';
  const API_HOST = 'free-api-live-football-data.p.rapidapi.com';

  try {
    const response = await fetch(`https://${API_HOST}/football-get-all-matches-by-date?date=${new Date().toISOString().split('T')[0]}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST
      }
    });

    if (!response.ok) {
      throw new Error(`API response status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch live matches', details: err.message });
  }
                                              }

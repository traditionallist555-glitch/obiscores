export default async function handler(req, res) {
  // Allow requests from your frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache for 30 seconds at the edge network (protects performance and bypasses rate limits)
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  try {
    // Generates today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch live matches directly from global endpoint
    const response = await fetch(`https://api.sofascore.com/api/v3/scheduled-events/${today}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Proxy error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');

  const API_KEY = '91e355defbmshab1ae17f5591707p1068eajsn0b2b10c983a9';
  const API_HOST = 'free-api-live-football-data.p.rapidapi.com';

  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`https://${API_HOST}/football-get-all-matches-by-date?date=${today}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': API_HOST
      }
    });

    if (!response.ok) throw new Error("API Limit or Error");
    const data = await response.json();

    return res.status(200).json(data);
  } catch (err) {
    // If API fails or hits limit, send fallback flag so Twitch live stream activates automatically
    return res.status(200).json({ useTwitchFallback: true, error: err.message });
  }
}

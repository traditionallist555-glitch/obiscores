export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');

  try {
    const formatDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    };

    let targetDateStr = req.query.date;
    if (!targetDateStr) {
      targetDateStr = formatDate(new Date());
    }

    const leagues = [
      'all', 'eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1',
      'uefa.champions', 'uefa.europa', 'uefa.ecl',
      'usa.1', 'arg.1', 'bra.1', 'col.1', 'mex.1',
      'caf.nations', 'caf.champions', 'afr.1',
      'afc.champions', 'saudi.1'
    ];

    const requests = leagues.map(league =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${targetDateStr}&limit=300`)
        .then(r => r.ok ? r.json() : { events: [] })
        .catch(() => ({ events: [] }))
    );

    const results = await Promise.all(requests);
    const eventMap = new Map();

    results.forEach(data => {
      if (data.events && Array.isArray(data.events)) {
        data.events.forEach(event => {
          if (!eventMap.has(event.id)) {
            eventMap.set(event.id, event);
          }
        });
      }
    });

    const combinedEvents = Array.from(eventMap.values());

    return res.status(200).json({ 
      selectedDate: targetDateStr,
      events: combinedEvents 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
      }
  

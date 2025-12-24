// api/manifest/definition.js
// Server-side API endpoint for fetching Destiny 2 manifest definitions

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tableName } = req.query;

    if (!tableName) {
      return res.status(400).json({ error: 'tableName query parameter is required' });
    }

    console.log(`Fetching manifest definition: ${tableName}`);

    // Step 1: Get manifest metadata from Bungie API
    const manifestResponse = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/', {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.BUNGIE_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!manifestResponse.ok) {
      throw new Error(`Failed to fetch manifest info: ${manifestResponse.status} ${manifestResponse.statusText}`);
    }

    const manifestData = await manifestResponse.json();

    if (manifestData.ErrorCode !== 1) {
      throw new Error(`Bungie API error: ${manifestData.ErrorStatus} - ${manifestData.Message}`);
    }

    // Step 2: Get the URL for the specific definition table
    const definitionPaths = manifestData.Response.jsonWorldComponentContentPaths.en;

    if (!definitionPaths[tableName]) {
      return res.status(404).json({
        error: `Definition table '${tableName}' not found`,
        availableTables: Object.keys(definitionPaths)
      });
    }

    const definitionUrl = `https://www.bungie.net${definitionPaths[tableName]}`;

    console.log(`Loading definition from: ${definitionUrl}`);

    // Step 3: Fetch the actual definition data
    const definitionResponse = await fetch(definitionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!definitionResponse.ok) {
      throw new Error(`Failed to fetch ${tableName}: ${definitionResponse.status} ${definitionResponse.statusText}`);
    }

    const definitionData = await definitionResponse.json();

    // Filter out blacklisted and redacted items (like the working data viewer does)
    let filteredData = {};
    let totalItems = 0;
    let filteredItems = 0;

    for (const [hash, item] of Object.entries(definitionData)) {
      totalItems++;

      // Skip blacklisted and redacted items
      if (item.blacklisted || item.redacted) {
        continue;
      }

      // Skip items without display properties (likely invalid/placeholder items)
      if (tableName === 'DestinyInventoryItemDefinition' && (!item.displayProperties || !item.displayProperties.name)) {
        continue;
      }

      filteredData[hash] = item;
      filteredItems++;
    }

    console.log(`Filtered ${tableName}: ${filteredItems}/${totalItems} items (removed ${totalItems - filteredItems} blacklisted/redacted/invalid items)`);

    // Set caching headers for performance (1 hour cache)
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');

    return res.status(200).json(filteredData);

  } catch (error) {
    console.error('Error fetching manifest definition:', error);
    return res.status(500).json({
      error: 'Failed to fetch manifest definition',
      details: error.message
    });
  }
}
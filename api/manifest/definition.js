// api/manifest/definition.js
// Get manifest definitions (proxies to GitHub CDN or returns from local cache)

const MANIFEST_BASE_URL = 'https://raw.githubusercontent.com/sickontuesdays/destiny-manifest-data/main/';

// In-memory cache for small definitions
const definitionCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tableName } = req.query;

    if (!tableName) {
      return res.status(400).json({ error: 'Missing tableName parameter' });
    }

    // Valid definition names
    const validTables = [
      'DestinyStatDefinition',
      'DestinyClassDefinition',
      'DestinyDamageTypeDefinition',
      'DestinyTraitDefinition',
      'DestinyInventoryItemDefinition',
      'DestinySandboxPerkDefinition',
      'DestinyPlugSetDefinition',
      'DestinySocketTypeDefinition',
      'DestinySocketCategoryDefinition',
      'DestinyItemCategoryDefinition',
      'DestinyActivityDefinition',
      'DestinyActivityModeDefinition',
      'DestinyActivityTypeDefinition',
      'DestinyPlaceDefinition',
      'DestinyDestinationDefinition',
      'DestinyVendorDefinition',
      'DestinyFactionDefinition',
      'DestinyMilestoneDefinition',
      'DestinySeasonDefinition',
      'DestinySeasonPassDefinition',
      'DestinyRecordDefinition',
      'DestinyCollectibleDefinition',
      'DestinyPresentationNodeDefinition',
      'DestinyObjectiveDefinition',
      'DestinyProgressionDefinition',
      'DestinyRaceDefinition',
      'DestinyGenderDefinition',
      'DestinyTalentGridDefinition',
      'DestinyEnergyTypeDefinition',
      'DestinyEquipmentSlotDefinition',
      'DestinyInventoryBucketDefinition',
      'DestinyLoreDefinition',
      'DestinyMetricDefinition',
      'DestinyPowerCapDefinition',
      'DestinyBreakerTypeDefinition'
    ];

    // Check if valid table name
    if (!validTables.includes(tableName)) {
      return res.status(400).json({
        error: 'Invalid table name',
        validTables
      });
    }

    // Check cache for smaller tables
    const cacheKey = tableName;
    const cached = definitionCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cached.data);
    }

    // Fetch from GitHub CDN
    const url = `${MANIFEST_BASE_URL}${tableName}.json`;

    console.log(`Fetching manifest: ${tableName}`);

    const response = await fetch(url);

    if (!response.ok) {
      // Try chunked version for large files
      if (response.status === 404) {
        // Try loading chunked files
        const chunks = [];
        for (let i = 1; i <= 10; i++) {
          try {
            const chunkUrl = `${MANIFEST_BASE_URL}${tableName}_part${i}.json`;
            const chunkResponse = await fetch(chunkUrl);
            if (chunkResponse.ok) {
              const chunkData = await chunkResponse.json();
              chunks.push(chunkData);
            } else {
              break;
            }
          } catch {
            break;
          }
        }

        if (chunks.length > 0) {
          // Merge chunks
          const merged = Object.assign({}, ...chunks);

          // Cache if reasonable size (< 50MB estimated)
          const size = JSON.stringify(merged).length;
          if (size < 50 * 1024 * 1024) {
            definitionCache.set(cacheKey, {
              data: merged,
              timestamp: Date.now()
            });
          }

          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Chunks', chunks.length.toString());
          return res.status(200).json(merged);
        }
      }

      throw new Error(`Failed to fetch ${tableName}: ${response.status}`);
    }

    const data = await response.json();

    // Cache smaller definitions
    const size = JSON.stringify(data).length;
    if (size < 10 * 1024 * 1024) { // Cache if < 10MB
      definitionCache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }

    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(data);

  } catch (error) {
    console.error('Manifest fetch error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch manifest definition'
    });
  }
};

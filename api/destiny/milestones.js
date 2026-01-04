// api/destiny/milestones.js
// Get public milestones (weekly rotations, nightfall, etc.)

const bungieAPI = require('../../lib/bungie-api');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const milestones = await bungieAPI.getPublicMilestones();

    res.status(200).json({
      milestones,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('Milestones fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch milestones',
      errorCode: error.errorCode
    });
  }
};

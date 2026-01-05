// api/destiny/news.js
// Get Destiny 2 news articles from Bungie

const bungieAPI = require('../../lib/bungie-api');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page, category } = req.query;

    const pageToken = page || '';
    // Use 'destiny' category to filter to Destiny 2 news only
    const categoryFilter = category || 'destiny';

    const news = await bungieAPI.getNewsArticles(pageToken, categoryFilter);

    // Process news articles
    const articles = (news.NewsArticles || []).map(article => {
      // Handle image path - may be full URL or relative path
      let imageUrl = null;
      if (article.ImagePath) {
        if (article.ImagePath.startsWith('http')) {
          imageUrl = article.ImagePath;
        } else {
          imageUrl = `https://www.bungie.net${article.ImagePath.startsWith('/') ? '' : '/'}${article.ImagePath}`;
        }
      }

      return {
        title: article.Title,
        subtitle: article.Subtitle,
        description: article.Description,
        link: article.Link,
        pubDate: article.PubDate,
        uniqueIdentifier: article.UniqueIdentifier,
        imageUrl,
        optionalMobileImagePath: article.OptionalMobileImagePath,
        htmlContent: article.HtmlContent
      };
    });

    res.status(200).json({
      articles,
      categoryTag: news.CategoryTag,
      currentPaginationToken: news.CurrentPaginationToken,
      nextPaginationToken: news.NextPaginationToken,
      resultCountThisPage: news.ResultCountThisPage,
      fetchTimestamp: Date.now()
    });

  } catch (error) {
    console.error('News fetch error:', error);
    res.status(error.status || 500).json({
      error: error.message || 'Failed to fetch news',
      errorCode: error.errorCode
    });
  }
};

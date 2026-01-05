/**
 * News Panel - Bungie news articles and TWID/TWAB posts
 */

import { apiClient } from '../api/bungie-api-client.js';

export class NewsPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.articles = [];
    this.currentFilter = 'all';
  }

  /**
   * Initialize news panel
   */
  async init() {
    this.render();
  }

  /**
   * Load news data
   */
  async load() {
    try {
      this.showLoading();

      // News doesn't require authentication
      try {
        const data = await apiClient.getNews();
        let articles = data.articles || [];

        // Sort articles by publication date (most recent first)
        articles = this.sortByDate(articles);

        this.articles = articles;
      } catch (apiError) {
        console.warn('News load API error:', apiError);
        this.articles = [];
      }

      this.render();
    } catch (error) {
      console.error('News load error:', error);
      this.showError(error.message);
    }
  }

  /**
   * Sort articles by publication date (most recent first)
   */
  sortByDate(articles) {
    return articles.sort((a, b) => {
      const dateA = new Date(a.PubDate || a.pubDate || 0);
      const dateB = new Date(b.PubDate || b.pubDate || 0);
      return dateB - dateA; // Most recent first
    });
  }

  /**
   * Render news panel
   */
  render() {
    let html = `
      <div class="news-panel">
        <div class="news-filters">
          <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
          <button class="filter-btn ${this.currentFilter === 'twid' ? 'active' : ''}" data-filter="twid">TWID</button>
          <button class="filter-btn ${this.currentFilter === 'updates' ? 'active' : ''}" data-filter="updates">Updates</button>
          <button class="filter-btn ${this.currentFilter === 'community' ? 'active' : ''}" data-filter="community">Community</button>
        </div>
        <div class="news-content">
          ${this.renderArticles()}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  /**
   * Render articles list
   */
  renderArticles() {
    if (this.articles.length === 0) {
      return '<div class="no-data">No news articles available</div>';
    }

    const filtered = this.filterArticles();

    if (filtered.length === 0) {
      return '<div class="no-data">No articles match this filter</div>';
    }

    let html = '<div class="articles-list">';

    filtered.slice(0, 10).forEach(article => {
      html += this.renderArticle(article);
    });

    html += '</div>';
    return html;
  }

  /**
   * Render single article
   */
  renderArticle(article) {
    const title = article.Title || article.title || 'Untitled';
    const description = article.Description || article.description || '';

    // Handle both imageUrl (from server transform) and ImagePath (raw API)
    let image = article.imageUrl || null;
    if (!image) {
      const imagePath = article.ImagePath || article.imagePath;
      if (imagePath) {
        image = `https://www.bungie.net${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
      }
    }

    // Ensure link is absolute URL to bungie.net
    let linkPath = article.Link || article.link;
    let link = '#';
    if (linkPath) {
      if (linkPath.startsWith('http')) {
        link = linkPath;
      } else {
        link = `https://www.bungie.net${linkPath.startsWith('/') ? '' : '/'}${linkPath}`;
      }
    }

    const date = article.PubDate || article.pubDate
      ? this.formatDate(article.PubDate || article.pubDate)
      : '';
    const category = this.getArticleCategory(article);

    return `
      <a href="${link}" target="_blank" rel="noopener" class="article-card">
        ${image ? `
          <div class="article-image">
            <img src="${image}" alt="${title}" loading="lazy">
          </div>
        ` : ''}
        <div class="article-content">
          <span class="article-category">${category}</span>
          <h4 class="article-title">${title}</h4>
          <p class="article-desc">${description}</p>
          <span class="article-date">${date}</span>
        </div>
      </a>
    `;
  }

  /**
   * Filter articles based on current filter
   */
  filterArticles() {
    if (this.currentFilter === 'all') {
      return this.articles;
    }

    return this.articles.filter(article => {
      // Handle both API property name cases
      const title = (article.Title || article.title || '').toLowerCase();
      const description = (article.Description || article.description || '').toLowerCase();
      const combined = title + ' ' + description;

      switch (this.currentFilter) {
        case 'twid':
          return combined.includes('this week') ||
                 combined.includes('twid') ||
                 combined.includes('twab') ||
                 combined.includes('destiny');
        case 'updates':
          return combined.includes('update') ||
                 combined.includes('patch') ||
                 combined.includes('hotfix') ||
                 combined.includes('maintenance') ||
                 combined.includes('fix');
        case 'community':
          return combined.includes('community') ||
                 combined.includes('spotlight') ||
                 combined.includes('motw') ||
                 combined.includes('artist') ||
                 combined.includes('bungie rewards');
        default:
          return true;
      }
    });
  }

  /**
   * Get article category
   */
  getArticleCategory(article) {
    // Handle both API property name cases
    const title = (article.Title || article.title || '').toLowerCase();

    if (title.includes('this week') || title.includes('twid') || title.includes('twab')) {
      return 'TWID';
    }
    if (title.includes('update') || title.includes('patch') || title.includes('hotfix')) {
      return 'Update';
    }
    if (title.includes('community') || title.includes('spotlight') || title.includes('motw')) {
      return 'Community';
    }
    if (title.includes('destiny 2') || title.includes('destiny')) {
      return 'Destiny 2';
    }

    return 'News';
  }

  /**
   * Format date
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;

      // Less than 24 hours ago
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        if (hours === 0) return 'Just now';
        return `${hours}h ago`;
      }

      // Less than 7 days ago
      if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
      }

      // Otherwise show date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return '';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentFilter = btn.dataset.filter;
        this.render();
      });
    });
  }

  /**
   * Show loading state
   */
  showLoading() {
    this.container.innerHTML = `
      <div class="panel-loading">
        <div class="loading-spinner"></div>
        <span>Loading news...</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="panel-error">
        <p>Error loading news</p>
        <small>${message}</small>
        <button onclick="window.dashboard?.panelManager?.loadPanel('news')">Retry</button>
      </div>
    `;
  }
}

export default NewsPanel;

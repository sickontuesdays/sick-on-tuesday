/**
 * Build Crafter Card - Interactive build generation UI
 * Replaces the static Build Spotlight card with intelligent build crafting
 */

export class BuildCrafter {
  constructor(cardElement, buildAnalyzer) {
    this.cardEl = cardElement;
    this.analyzer = buildAnalyzer;
    this.contentEl = cardElement.querySelector('#build-crafter-content');

    // State
    this.isInitialized = false;
    this.isLoading = false;
    this.currentBuild = null;
    this.queryHistory = JSON.parse(localStorage.getItem('buildcrafterHistory') || '[]');

    // UI elements
    this.queryInput = null;
    this.generateBtn = null;
    this.resultsContainer = null;
    this.loadingIndicator = null;
    this.historyContainer = null;
  }

  /**
   * Initialize Build Crafter card
   */
  async init() {
    try {
      console.log('Initializing Build Crafter card...');

      // Initialize analyzer in background
      this.analyzer.initialize().catch(error => {
        console.warn('Build Analyzer initialization failed:', error);
      });

      // Create UI
      this.createUI();

      // Set up event listeners
      this.setupEventListeners();

      // Show initial state
      this.showWelcomeState();

      this.isInitialized = true;
      console.log('Build Crafter card ready');
    } catch (error) {
      console.error('Build Crafter initialization failed:', error);
      this.showErrorState('Failed to initialize Build Crafter');
    }
  }

  /**
   * Create the UI structure
   */
  createUI() {
    this.contentEl.innerHTML = `
      <div class="build-crafter">
        <!-- Query Input Section -->
        <div class="query-section">
          <div class="input-group">
            <input
              type="text"
              id="build-query"
              class="query-input"
              placeholder="Describe your ideal build... (e.g., 'Hunter void build for raids')"
              autocomplete="off"
            >
            <button id="generate-btn" class="generate-btn" type="button">
              <span class="btn-icon">🔍</span>
              <span class="btn-text">Generate</span>
            </button>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <button class="quick-btn" data-query="Hunter void build for raids">🎯 Raid Hunter</button>
            <button class="quick-btn" data-query="Titan solar tank build">🛡️ Solar Titan</button>
            <button class="quick-btn" data-query="Warlock arc DPS build">⚡ Arc Warlock</button>
            <button class="settings-btn" title="Settings">⚙️</button>
          </div>
        </div>

        <!-- Loading State -->
        <div id="loading-indicator" class="loading-state hidden">
          <div class="loading-animation">
            <div class="spinner"></div>
            <span class="loading-text">Analyzing manifest data...</span>
          </div>
        </div>

        <!-- Results Section -->
        <div id="results-container" class="results-section hidden">
          <!-- Build results will be populated here -->
        </div>

        <!-- Welcome/Empty State -->
        <div id="welcome-state" class="welcome-state">
          <div class="welcome-content">
            <div class="welcome-icon">🎯</div>
            <h3>Build Crafter</h3>
            <p>Describe your ideal Destiny 2 build and I'll generate optimized loadouts with synergy detection.</p>

            <div class="feature-list">
              <div class="feature-item">
                <span class="feature-icon">🧬</span>
                <span>Trait-based synergy analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>Activity-optimized builds</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🎨</span>
                <span>Natural language queries</span>
              </div>
            </div>
          </div>
        </div>

        <!-- History Section -->
        <div id="history-container" class="history-section hidden">
          <h4>Recent Builds</h4>
          <div class="history-list">
            <!-- History items will be populated here -->
          </div>
        </div>
      </div>
    `;

    // Cache DOM references
    this.queryInput = this.contentEl.querySelector('#build-query');
    this.generateBtn = this.contentEl.querySelector('#generate-btn');
    this.resultsContainer = this.contentEl.querySelector('#results-container');
    this.loadingIndicator = this.contentEl.querySelector('#loading-indicator');
    this.historyContainer = this.contentEl.querySelector('#history-container');
    this.welcomeState = this.contentEl.querySelector('#welcome-state');

    // Apply CSS styles
    this.addStyles();
  }

  /**
   * Add CSS styles for Build Crafter
   */
  addStyles() {
    const styles = `
      <style>
        .build-crafter {
          padding: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .query-section {
          flex-shrink: 0;
        }

        .input-group {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .query-input {
          flex: 1;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--panel2);
          color: var(--ink);
          font-size: 14px;
          font-family: inherit;
        }

        .query-input:focus {
          outline: none;
          border-color: var(--arc);
          box-shadow: 0 0 0 2px rgba(125, 211, 252, 0.2);
        }

        .generate-btn {
          padding: 10px 16px;
          background: linear-gradient(135deg, var(--arc) 0%, var(--arc2) 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }

        .generate-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(125, 211, 252, 0.3);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .quick-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .quick-btn {
          padding: 6px 12px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .quick-btn:hover {
          background: var(--panel2);
          color: var(--ink);
          border-color: var(--arc);
        }

        .settings-btn {
          padding: 6px 8px;
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--muted);
          cursor: pointer;
          margin-left: auto;
        }

        .settings-btn:hover {
          color: var(--ink);
          border-color: var(--arc);
        }

        .loading-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-animation {
          text-align: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--arc);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          color: var(--muted);
          font-size: 14px;
        }

        .welcome-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 20px;
        }

        .welcome-content {
          max-width: 280px;
        }

        .welcome-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .welcome-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--ink);
        }

        .welcome-content p {
          margin: 0 0 20px 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.5;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-align: left;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted);
        }

        .feature-icon {
          font-size: 16px;
        }

        .results-section {
          flex: 1;
          overflow-y: auto;
        }

        .build-result {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .build-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .build-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
        }

        .confidence-score {
          background: var(--good);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .build-description {
          color: var(--muted);
          font-size: 14px;
          margin-bottom: 16px;
        }

        .loadout-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .weapon-slot {
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }

        .slot-icon {
          font-size: 24px;
          margin-bottom: 4px;
        }

        .slot-label {
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .synergies {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
        }

        .synergies-label {
          font-size: 13px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .synergy-tags {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .synergy-tag {
          background: rgba(125, 211, 252, 0.1);
          color: var(--arc);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
        }

        .build-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .action-btn {
          padding: 6px 12px;
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--ink);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: var(--arc);
          color: white;
          border-color: var(--arc);
        }

        .hidden {
          display: none !important;
        }

        .error-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: var(--bad);
          padding: 20px;
        }
      </style>
    `;

    // Add styles to document head
    if (!document.querySelector('#build-crafter-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'build-crafter-styles';
      styleEl.textContent = styles.replace('<style>', '').replace('</style>', '');
      document.head.appendChild(styleEl);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Generate button
    this.generateBtn.addEventListener('click', () => {
      this.handleGenerate();
    });

    // Enter key on input
    this.queryInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleGenerate();
      }
    });

    // Quick action buttons
    this.contentEl.addEventListener('click', (e) => {
      const quickBtn = e.target.closest('.quick-btn');
      if (quickBtn && quickBtn.dataset.query) {
        this.queryInput.value = quickBtn.dataset.query;
        this.handleGenerate();
      }

      const settingsBtn = e.target.closest('.settings-btn');
      if (settingsBtn) {
        this.showSettings();
      }
    });

    // Input debouncing for live suggestions (future enhancement)
    let inputTimeout;
    this.queryInput.addEventListener('input', () => {
      clearTimeout(inputTimeout);
      inputTimeout = setTimeout(() => {
        // Could show live suggestions here
      }, 300);
    });
  }

  /**
   * Handle build generation
   */
  async handleGenerate() {
    const query = this.queryInput.value.trim();
    if (!query) return;

    if (this.isLoading) return;

    try {
      this.setLoadingState(true);
      this.showLoadingState('Analyzing your query...');

      // Add query to history
      this.addToHistory(query);

      // Generate build
      const build = await this.analyzer.generateBuild(query);

      // Show results
      this.showBuildResult(build);

      // Clear input
      this.queryInput.value = '';

    } catch (error) {
      console.error('Build generation failed:', error);
      this.showErrorState('Failed to generate build. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Show welcome state
   */
  showWelcomeState() {
    this.hideAllStates();
    this.welcomeState.classList.remove('hidden');
  }

  /**
   * Show loading state
   */
  showLoadingState(message = 'Loading...') {
    this.hideAllStates();
    this.loadingIndicator.classList.remove('hidden');
    this.loadingIndicator.querySelector('.loading-text').textContent = message;
  }

  /**
   * Show build result
   */
  showBuildResult(build) {
    this.hideAllStates();
    this.resultsContainer.classList.remove('hidden');

    const confidence = Math.round((build.confidence || 0.5) * 100);
    const confidenceClass = confidence >= 80 ? 'good' : confidence >= 60 ? 'arc' : 'bad';

    this.resultsContainer.innerHTML = `
      <div class="build-result">
        <div class="build-header">
          <div class="build-title">${build.name || 'Generated Build'}</div>
          <div class="confidence-score" style="background: var(--${confidenceClass})">
            ${confidence}% Match
          </div>
        </div>

        <div class="build-description">
          ${build.description || 'AI-generated build based on your requirements'}
        </div>

        <div class="loadout-grid">
          <div class="weapon-slot">
            <div class="slot-icon">🔫</div>
            <div class="slot-label">Kinetic</div>
            <div class="slot-name">${build.weapons?.kinetic?.name || 'Primary Weapon'}</div>
          </div>
          <div class="weapon-slot">
            <div class="slot-icon">⚡</div>
            <div class="slot-label">Energy</div>
            <div class="slot-name">${build.weapons?.energy?.name || 'Special Weapon'}</div>
          </div>
          <div class="weapon-slot">
            <div class="slot-icon">💥</div>
            <div class="slot-label">Power</div>
            <div class="slot-name">${build.weapons?.power?.name || 'Heavy Weapon'}</div>
          </div>
        </div>

        ${this.renderStats(build.stats)}

        <div class="synergies">
          <div class="synergies-label">✨ Detected Synergies</div>
          <div class="synergy-tags">
            ${(build.synergies || ['Balanced Build']).map(synergy =>
              `<span class="synergy-tag">${synergy}</span>`
            ).join('')}
          </div>
        </div>

        <div class="build-actions">
          <button class="action-btn" onclick="buildCrafter.copyBuild()">📋 Copy Build</button>
          <button class="action-btn" onclick="buildCrafter.saveBuild()">💾 Save Build</button>
          <button class="action-btn" onclick="buildCrafter.shareBuild()">🔗 Share</button>
          <button class="action-btn" onclick="buildCrafter.refineBuild()">🔄 Refine</button>
        </div>
      </div>
    `;

    this.currentBuild = build;
  }

  /**
   * Render stat bars
   */
  renderStats(stats) {
    if (!stats) return '';

    const statEntries = Object.entries(stats);
    if (statEntries.length === 0) return '';

    const statBars = statEntries.map(([stat, value]) => {
      const tier = Math.floor(value / 10);
      const percentage = Math.min(100, (value / 100) * 100);

      return `
        <div class="stat-bar">
          <div class="stat-info">
            <span class="stat-name">${this.formatStatName(stat)}</span>
            <span class="stat-value">${value} (T${tier})</span>
          </div>
          <div class="stat-progress">
            <div class="stat-fill" style="width: ${percentage}%"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="stats-section">
        <div class="stats-label">📊 Stat Distribution</div>
        <div class="stats-grid">
          ${statBars}
        </div>
      </div>
    `;
  }

  /**
   * Format stat names for display
   */
  formatStatName(statName) {
    const statMap = {
      mobility: '💨 Mobility',
      resilience: '🛡️ Resilience',
      recovery: '❤️ Recovery',
      discipline: '💣 Discipline',
      intellect: '🧠 Intellect',
      strength: '💪 Strength'
    };

    return statMap[statName] || statName.charAt(0).toUpperCase() + statName.slice(1);
  }

  /**
   * Show error state
   */
  showErrorState(message) {
    this.hideAllStates();
    this.resultsContainer.classList.remove('hidden');
    this.resultsContainer.innerHTML = `
      <div class="error-state">
        <div>
          <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
          <div style="font-weight: 600; margin-bottom: 8px;">Error</div>
          <div style="color: var(--muted);">${message}</div>
        </div>
      </div>
    `;
  }

  /**
   * Hide all state containers
   */
  hideAllStates() {
    this.welcomeState.classList.add('hidden');
    this.loadingIndicator.classList.add('hidden');
    this.resultsContainer.classList.add('hidden');
    this.historyContainer.classList.add('hidden');
  }

  /**
   * Set loading state
   */
  setLoadingState(loading) {
    this.isLoading = loading;
    this.generateBtn.disabled = loading;

    if (loading) {
      this.generateBtn.querySelector('.btn-text').textContent = 'Generating...';
      this.generateBtn.querySelector('.btn-icon').textContent = '⏳';
    } else {
      this.generateBtn.querySelector('.btn-text').textContent = 'Generate';
      this.generateBtn.querySelector('.btn-icon').textContent = '🔍';
    }
  }

  /**
   * Add query to history
   */
  addToHistory(query) {
    this.queryHistory.unshift({
      query,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    });

    // Keep only last 10 queries
    this.queryHistory = this.queryHistory.slice(0, 10);

    // Save to localStorage
    localStorage.setItem('buildcrafterHistory', JSON.stringify(this.queryHistory));
  }

  /**
   * Show settings dialog
   */
  showSettings() {
    alert('Settings panel coming soon! For now, you can:\n\n• Use natural language queries\n• Try different class/element combinations\n• Specify activities (raid, pvp, gambit)\n• Mention weapon types or playstyles');
  }

  // ========== Build Actions ==========

  copyBuild() {
    if (!this.currentBuild) return;

    const buildText = `${this.currentBuild.name}\n\n${this.currentBuild.description}\n\nSynergies: ${(this.currentBuild.synergies || []).join(', ')}`;

    navigator.clipboard.writeText(buildText).then(() => {
      this.showToast('Build copied to clipboard!');
    }).catch(() => {
      this.showToast('Failed to copy build', 'error');
    });
  }

  saveBuild() {
    if (!this.currentBuild) return;

    const savedBuilds = JSON.parse(localStorage.getItem('savedBuilds') || '[]');
    const buildToSave = {
      ...this.currentBuild,
      id: Math.random().toString(36).substr(2, 9),
      savedAt: Date.now()
    };

    savedBuilds.unshift(buildToSave);
    localStorage.setItem('savedBuilds', JSON.stringify(savedBuilds.slice(0, 50))); // Keep only 50 builds

    this.showToast('Build saved successfully!');
  }

  shareBuild() {
    if (!this.currentBuild) return;

    // Create shareable link (would need backend implementation)
    const shareData = {
      title: this.currentBuild.name,
      text: this.currentBuild.description,
      url: window.location.href // Could include build hash in URL
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback - copy link
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.showToast('Build link copied to clipboard!');
      });
    }
  }

  refineBuild() {
    if (!this.currentBuild) return;

    // Set query input with refinement prompt
    this.queryInput.value = `Refine this build: ${this.currentBuild.query || 'previous build'}`;
    this.queryInput.focus();
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'var(--good)' : 'var(--bad)'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Make Build Crafter globally available for action buttons
window.buildCrafter = null;
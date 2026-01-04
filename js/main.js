/**
 * Main Entry Point - Guardian Command Center Dashboard
 * Initializes all systems and manages the dashboard
 */

import { authClient } from './core/auth-client.js';
import { storageManager } from './core/storage-manager.js';
import { GridManager } from './core/grid-manager.js';
import { manifestLoader } from './api/manifest-loader.js';
import { panelManager } from './panels/panel-manager.js';
import { FriendsList } from './panels/friends-list.js';
import { loadoutManager } from './utils/loadout-manager.js';

class Dashboard {
  constructor() {
    this.isInitialized = false;
    this.isLocked = false;

    // Core systems
    this.authClient = authClient;
    this.storageManager = storageManager;
    this.gridManager = null;
    this.manifestLoader = manifestLoader;
    this.panelManager = panelManager;
    this.friendsList = null;

    // State
    this.activeTabId = null;
    this.tabs = [];

    // DOM elements
    this.gridEl = null;
    this.dropHintEl = null;

    // Drag state
    this.dragging = null;
    this.resizing = null;
  }

  /**
   * Initialize dashboard
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Guardian Command Center...');

      // Initialize DOM references
      this.initializeDOM();

      // Initialize auth client
      await this.authClient.init();

      // Initialize grid manager
      this.initializeGrid();

      // Initialize manifest loader (background)
      this.manifestLoader.initialize().catch(err => {
        console.warn('Manifest initialization error:', err);
      });

      // Initialize panels
      await this.panelManager.init();

      // Initialize friends list
      this.initializeFriendsList();

      // Initialize loadout manager
      loadoutManager.init();

      // Setup event listeners
      this.setupEventListeners();

      // Setup auth UI
      this.setupAuthUI();

      // Load initial layout
      this.loadInitialLayout();

      this.isInitialized = true;
      console.log('Dashboard initialized successfully');

      // Make available globally for debugging
      window.dashboard = this;
      window.panelManager = this.panelManager;
      window.friendsList = this.friendsList;
      window.loadoutManager = loadoutManager;
      window.manifestLoader = manifestLoader;

    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      this.showInitError(error);
    }
  }

  /**
   * Initialize DOM references
   */
  initializeDOM() {
    this.gridEl = document.getElementById('grid');
    this.dropHintEl = document.getElementById('dropHint');

    if (!this.gridEl) {
      throw new Error('Grid element not found');
    }
  }

  /**
   * Initialize grid manager
   */
  initializeGrid() {
    this.gridManager = new GridManager(this.gridEl, this.dropHintEl);
    this.gridManager.initializeItems();

    // Save layout on change
    this.gridManager.onLayoutChange = (layoutData) => {
      if (this.activeTabId) {
        this.storageManager.saveLayout(this.activeTabId, layoutData);
      }
    };
  }

  /**
   * Initialize friends list
   */
  initializeFriendsList() {
    const friendsContainer = document.getElementById('friends-list');
    if (friendsContainer) {
      this.friendsList = new FriendsList(friendsContainer);
      this.friendsList.init();
    }
  }

  /**
   * Setup auth UI
   */
  setupAuthUI() {
    const authToggle = document.getElementById('authToggle');

    if (authToggle) {
      // Initial state
      this.updateAuthUI();

      // Click handler
      authToggle.addEventListener('click', () => {
        if (this.authClient.checkAuthenticated()) {
          // Show user menu or logout
          if (confirm('Sign out?')) {
            this.authClient.logout();
          }
        } else {
          this.authClient.login();
        }
      });

      // Listen for auth changes
      this.authClient.onAuthChange(() => {
        this.updateAuthUI();
      });
    }
  }

  /**
   * Update auth UI
   */
  updateAuthUI() {
    const authToggle = document.getElementById('authToggle');
    if (!authToggle) return;

    const textEl = authToggle.querySelector('.text');

    if (this.authClient.checkAuthenticated()) {
      const user = this.authClient.getUser();
      authToggle.classList.add('authenticated');
      authToggle.classList.remove('loading');
      if (textEl) textEl.textContent = user?.displayName || 'Signed In';
    } else {
      authToggle.classList.remove('authenticated', 'loading');
      if (textEl) textEl.textContent = 'Sign In';
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Lock toggle
    const lockToggle = document.getElementById('lockToggle');
    if (lockToggle) {
      lockToggle.addEventListener('click', () => this.toggleLock());
    }

    // Panel visibility dropdown
    this.setupPanelSelector();

    // Drag and drop
    this.setupDragDrop();

    // Resize
    this.setupResize();

    // Tab management
    this.setupTabs();

    // Window resize
    window.addEventListener('resize', () => {
      this.gridManager?.updateDimensions();
    });
  }

  /**
   * Setup panel selector in header
   */
  setupPanelSelector() {
    const panelSelector = document.getElementById('panelSelector');
    if (!panelSelector) return;

    // Populate with available panels
    const panels = this.gridManager?.getItems() || [];
    let html = '<div class="panel-selector-header">Toggle Panels</div>';

    panels.forEach(panel => {
      const isVisible = !panel.hidden;
      html += `
        <label class="panel-checkbox">
          <input type="checkbox" data-panel-id="${panel.id}" ${isVisible ? 'checked' : ''}>
          <span>${panel.el.querySelector('.title')?.textContent || panel.id}</span>
        </label>
      `;
    });

    panelSelector.innerHTML = html;

    // Handle checkbox changes
    panelSelector.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        const panelId = e.target.dataset.panelId;
        this.gridManager?.toggleItemVisibility(panelId, e.target.checked);
      }
    });
  }

  /**
   * Setup drag and drop
   */
  setupDragDrop() {
    let startMouse = null;

    // Mouse down on drag handle
    this.gridEl.addEventListener('mousedown', (e) => {
      if (this.isLocked) return;

      const bar = e.target.closest('.bar');
      if (!bar) return;

      const cardEl = bar.closest('.card');
      const item = this.gridManager.items.find(i => i.el === cardEl);
      if (!item) return;

      this.dragging = item;
      startMouse = { x: e.clientX, y: e.clientY };

      item.el.classList.add('dragging');
      e.preventDefault();
    });

    // Mouse move during drag
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;

      const deltaX = e.clientX - startMouse.x;
      const deltaY = e.clientY - startMouse.y;

      this.dragging.el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      const dropPos = this.gridManager.getDropPosition(e.clientX, e.clientY, this.dragging);
      this.gridManager.previewDrop(dropPos.x, dropPos.y, this.dragging);
    });

    // Mouse up to commit drag
    window.addEventListener('mouseup', (e) => {
      if (!this.dragging) return;

      const dropPos = this.gridManager.getDropPosition(e.clientX, e.clientY, this.dragging);
      this.gridManager.commitDrag(dropPos.x, dropPos.y, this.dragging);

      this.dragging.el.classList.remove('dragging');
      this.dragging.el.style.transform = '';
      this.dragging = null;
    });
  }

  /**
   * Setup resize
   */
  setupResize() {
    let startMouseR = null;
    let startSize = null;

    this.gridEl.addEventListener('mousedown', (e) => {
      if (this.isLocked) return;

      const resizeHandle = e.target.closest('.resize');
      if (!resizeHandle) return;

      const cardEl = resizeHandle.closest('.card');
      const item = this.gridManager.items.find(i => i.el === cardEl);
      if (!item) return;

      this.resizing = item;
      startMouseR = { x: e.clientX, y: e.clientY };
      startSize = { w: item.w, h: item.h };

      item.el.classList.add('dragging');
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.resizing) return;

      const deltaX = e.clientX - startMouseR.x;
      const deltaY = e.clientY - startMouseR.y;

      const deltaW = Math.round(deltaX / (this.gridManager.COLW + this.gridManager.GAP));
      const deltaH = Math.round(deltaY / this.gridManager.ROWH);

      this.resizing.w = Math.max(this.resizing.minW, Math.min(this.resizing.maxW, startSize.w + deltaW));
      this.resizing.h = Math.max(this.resizing.minH, startSize.h + deltaH);

      this.gridManager.clampToCols(this.resizing);
      this.gridManager.previewDrop(this.resizing.x, this.resizing.y, this.resizing);
    });

    window.addEventListener('mouseup', () => {
      if (!this.resizing) return;

      this.resizing.el.classList.remove('dragging');
      this.gridManager.hideDropHint();
      this.gridManager.applyLayout();

      this.resizing = null;
    });
  }

  /**
   * Setup tab management
   */
  setupTabs() {
    // Load tabs
    this.tabs = this.storageManager.loadTabsMeta();
    this.activeTabId = this.storageManager.getActiveTabId() || this.tabs[0]?.id;

    // Render tabs
    this.renderTabs();
  }

  /**
   * Render tabs
   */
  renderTabs() {
    const tabsEl = document.getElementById('layoutTabs');
    if (!tabsEl) return;

    let html = '';

    this.tabs.forEach(tab => {
      const isActive = tab.id === this.activeTabId ? 'active' : '';
      html += `
        <div class="tabRow">
          <div class="colorChip" style="background: ${tab.color}" data-tab="${tab.id}"></div>
          <button class="tabBtn ${isActive}" data-tab="${tab.id}">${tab.name}</button>
        </div>
      `;
    });

    // Keep add button and footer
    const addBtn = tabsEl.querySelector('.addBtn');
    const bulkBar = tabsEl.querySelector('.bulkBar');
    const footer = tabsEl.querySelector('.tabFooter');

    tabsEl.innerHTML = html;

    if (addBtn) tabsEl.appendChild(addBtn);
    if (bulkBar) tabsEl.appendChild(bulkBar);
    if (footer) tabsEl.appendChild(footer);

    // Tab click handlers
    tabsEl.querySelectorAll('.tabBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setActiveTab(btn.dataset.tab);
      });
    });
  }

  /**
   * Set active tab
   */
  setActiveTab(tabId) {
    this.activeTabId = tabId;
    this.storageManager.setActiveTabId(tabId);

    const layout = this.storageManager.loadLayout(tabId, this.gridManager.getDefaultLayout());
    this.gridManager.restoreLayout(layout);

    // Update accent color
    const tab = this.tabs.find(t => t.id === tabId);
    if (tab?.color) {
      this.setAccentColor(tab.color);
    }

    this.renderTabs();
  }

  /**
   * Set accent color
   */
  setAccentColor(hex) {
    document.documentElement.style.setProperty('--arc', hex);
    // Calculate darker shade
    const darker = this.adjustColor(hex, -10);
    document.documentElement.style.setProperty('--arc2', darker);
  }

  /**
   * Adjust color brightness
   */
  adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /**
   * Toggle layout lock
   */
  toggleLock() {
    this.isLocked = !this.isLocked;
    document.body.classList.toggle('locked', this.isLocked);
  }

  /**
   * Load initial layout
   */
  loadInitialLayout() {
    if (this.activeTabId) {
      const layout = this.storageManager.loadLayout(
        this.activeTabId,
        this.gridManager.getDefaultLayout()
      );
      this.gridManager.restoreLayout(layout);
    }
  }

  /**
   * Show initialization error
   */
  showInitError(error) {
    const body = document.body;
    body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: #fff; font-family: sans-serif;">
        <div style="text-align: center;">
          <h1>Failed to Initialize</h1>
          <p>${error.message}</p>
          <button onclick="location.reload()" style="padding: 10px 20px; cursor: pointer;">Retry</button>
        </div>
      </div>
    `;
  }

  /**
   * Get dashboard status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      locked: this.isLocked,
      authenticated: this.authClient.checkAuthenticated(),
      activeTab: this.activeTabId,
      gridStats: this.gridManager?.getStats(),
      manifestStatus: this.manifestLoader?.getLoadingStatus()
    };
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  const dashboard = new Dashboard();
  await dashboard.init();
});

export default Dashboard;

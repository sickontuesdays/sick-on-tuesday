/**
 * Main Module - Entry point for modularized dashboard
 * Initializes grid system, storage, and Build Crafter
 */

import { GridManager } from './core/grid-manager.js';
import { StorageManager } from './core/storage-manager.js';
import { ManifestLoader } from './api/manifest-loader.js';
import { BuildAnalyzer } from './core/build-analyzer.js';
import { BuildCrafter } from './cards/build-crafter.js';

class Dashboard {
  constructor() {
    this.isInitialized = false;
    this.isLocked = false;

    // Core systems
    this.gridManager = null;
    this.storageManager = null;
    this.manifestLoader = null;
    this.buildAnalyzer = null;
    this.buildCrafter = null;

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
   * Initialize dashboard with modular components
   */
  async init() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing modular dashboard...');

      // Initialize DOM references
      this.initializeDOM();

      // Initialize core systems
      await this.initializeCoreServices();

      // Initialize UI components
      this.initializeUI();

      // Initialize Build Crafter
      await this.initializeBuildCrafter();

      // Set up event listeners
      this.setupEventListeners();

      // Load initial layout
      this.loadInitialLayout();

      this.isInitialized = true;
      console.log('Dashboard initialization complete');
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize DOM element references
   */
  initializeDOM() {
    this.gridEl = document.getElementById('grid');
    this.dropHintEl = document.getElementById('dropHint');

    if (!this.gridEl || !this.dropHintEl) {
      throw new Error('Required DOM elements not found');
    }
  }

  /**
   * Initialize core services
   */
  async initializeCoreServices() {
    // Initialize storage manager
    this.storageManager = new StorageManager();

    // Initialize grid manager
    this.gridManager = new GridManager(this.gridEl, this.dropHintEl);
    this.gridManager.initializeItems();

    // Set up layout change callback
    this.gridManager.onLayoutChange = (layoutData) => {
      if (this.activeTabId) {
        this.storageManager.saveLayout(this.activeTabId, layoutData);
      }
    };

    // Initialize manifest loader
    // For local development, pass local path. For production, uses GitHub CDN by default
    const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    this.manifestLoader = new ManifestLoader(isLocal ? './data/manifest/' : null);

    // Initialize build analyzer
    this.buildAnalyzer = new BuildAnalyzer(this.manifestLoader);
  }

  /**
   * Initialize UI components and state
   */
  initializeUI() {
    // Load tabs
    this.tabs = this.storageManager.loadTabsMeta();
    this.activeTabId = this.storageManager.getActiveTabId() || this.tabs[0]?.id;

    // Initialize lock state
    this.updateLockState();
  }

  /**
   * Initialize Build Crafter component
   */
  async initializeBuildCrafter() {
    try {
      // Find Build Crafter card element
      const buildCrafterEl = document.querySelector('[data-id="build-crafter"]');
      if (!buildCrafterEl) {
        console.warn('Build Crafter card element not found, skipping initialization');
        return;
      }

      // Initialize Build Crafter
      this.buildCrafter = new BuildCrafter(buildCrafterEl, this.buildAnalyzer);
      await this.buildCrafter.init();

      console.log('Build Crafter initialized successfully');
    } catch (error) {
      console.warn('Build Crafter initialization failed:', error);
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Lock/unlock toggle
    const lockToggle = document.getElementById('lockToggle');
    if (lockToggle) {
      lockToggle.addEventListener('click', () => this.toggleLock());
    }

    // Drag and drop
    this.setupDragDropListeners();

    // Resize
    this.setupResizeListeners();

    // Tab management
    this.setupTabListeners();

    // Panel controls
    this.setupPanelListeners();

    // Window resize for responsive grid
    window.addEventListener('resize', () => {
      this.gridManager.updateDimensions();
    });
  }

  /**
   * Set up drag and drop event listeners
   */
  setupDragDropListeners() {
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

      // Apply transform for visual feedback
      this.dragging.el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      this.dragging.el.style.willChange = 'transform';

      // Calculate drop position
      const dropPos = this.gridManager.getDropPosition(e.clientX, e.clientY, this.dragging);

      // Preview drop with collision resolution
      this.gridManager.previewDrop(dropPos.x, dropPos.y, this.dragging);
    });

    // Mouse up to commit drag
    window.addEventListener('mouseup', () => {
      if (!this.dragging) return;

      // Get final drop position
      const rect = this.gridEl.getBoundingClientRect();
      const relativeX = startMouse.x - rect.left + parseFloat(this.dragging.el.style.transform.match(/translateX\((.+)px\)/)?.[1] || 0);
      const relativeY = startMouse.y - rect.top + parseFloat(this.dragging.el.style.transform.match(/translateY\((.+)px\)/)?.[1] || 0);

      const finalPos = this.gridManager.getDropPosition(relativeX, relativeY, this.dragging);

      // Commit the drag operation
      this.gridManager.commitDrag(finalPos.x, finalPos.y, this.dragging);

      // Clean up
      this.dragging.el.classList.remove('dragging');
      this.dragging.el.style.transform = '';
      this.dragging.el.style.willChange = '';
      this.dragging = null;
    });
  }

  /**
   * Set up resize event listeners
   */
  setupResizeListeners() {
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
      const gridGap = 14; // From CSS

      const deltaW = Math.round(deltaX / (this.gridManager.COLW + gridGap));
      const deltaH = Math.round(deltaY / this.gridManager.ROWH);

      this.resizing.w = Math.max(this.resizing.minW, Math.min(this.resizing.maxW, startSize.w + deltaW));
      this.resizing.h = Math.max(this.resizing.minH, startSize.h + deltaH);

      this.gridManager.clampToCols(this.resizing);

      // Preview resize with collision resolution
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
   * Set up tab management listeners
   */
  setupTabListeners() {
    // Tab switching
    const tabsEl = document.getElementById('layoutTabs');
    if (tabsEl) {
      tabsEl.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tabBtn');
        if (tabBtn && tabBtn.dataset.tab) {
          this.setActiveTab(tabBtn.dataset.tab);
        }
      });
    }

    // Add tab button
    const addTabBtn = document.getElementById('addTabBtn');
    if (addTabBtn) {
      addTabBtn.addEventListener('click', () => this.createNewTab());
    }
  }

  /**
   * Set up panel control listeners
   */
  setupPanelListeners() {
    // Panel visibility
    const panelList = document.getElementById('panelList');
    if (panelList) {
      panelList.addEventListener('change', (e) => {
        const checkbox = e.target.closest('input[type="checkbox"]');
        if (!checkbox) return;

        this.gridManager.toggleItemVisibility(checkbox.dataset.id, checkbox.checked);
      });
    }
  }

  /**
   * Toggle layout lock state
   */
  toggleLock() {
    this.isLocked = !this.isLocked;
    this.updateLockState();
  }

  /**
   * Update lock state UI
   */
  updateLockState() {
    document.body.classList.toggle('locked', this.isLocked);
  }

  /**
   * Set active tab and load its layout
   */
  setActiveTab(tabId) {
    if (this.activeTabId === tabId) return;

    this.activeTabId = tabId;
    this.storageManager.setActiveTabId(tabId);

    // Load layout for this tab
    const layoutData = this.storageManager.loadLayout(tabId, this.gridManager.getDefaultLayout());
    this.gridManager.restoreLayout(layoutData);

    // Update UI
    this.updateTabUI();
  }

  /**
   * Create new tab
   */
  createNewTab() {
    const name = prompt('Tab name:') || `Layout ${this.tabs.length + 1}`;
    const newTab = this.storageManager.createTab(name);

    if (newTab) {
      this.tabs = this.storageManager.loadTabsMeta();
      this.setActiveTab(newTab.id);
      this.updateTabUI();
    }
  }

  /**
   * Update tab UI
   */
  updateTabUI() {
    // This would update tab visual state
    // For now, just log the active tab
    console.log('Active tab:', this.activeTabId);
  }

  /**
   * Load initial layout
   */
  loadInitialLayout() {
    if (this.activeTabId) {
      const layoutData = this.storageManager.loadLayout(this.activeTabId, this.gridManager.getDefaultLayout());
      this.gridManager.restoreLayout(layoutData);
    }
  }

  /**
   * Get dashboard status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      locked: this.isLocked,
      activeTab: this.activeTabId,
      gridStats: this.gridManager?.getStats(),
      manifestStatus: this.manifestLoader?.getLoadingStatus(),
      buildCrafterReady: !!this.buildCrafter
    };
  }
}

// Initialize dashboard when DOM is loaded
let dashboardInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    dashboardInstance = new Dashboard();
    await dashboardInstance.init();

    // Make dashboard globally available for debugging
    window.dashboard = dashboardInstance;

    console.log('Dashboard ready:', dashboardInstance.getStatus());
  } catch (error) {
    console.error('Failed to initialize dashboard:', error);
  }
});

// Export for module use
export default Dashboard;
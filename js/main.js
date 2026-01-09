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
      this.authClient.onAuthChange((event) => {
        this.updateAuthUI();
        // Switch layout state based on auth
        if (event.isAuthenticated) {
          this.applyLoggedInState();
        } else {
          this.applyLoggedOutState();
        }
      });
    }
  }

  /**
   * Update auth UI
   */
  updateAuthUI() {
    const authToggle = document.getElementById('authToggle');
    const mobileAuthToggle = document.getElementById('mobileAuthToggle');
    const isAuthenticated = this.authClient.checkAuthenticated();
    const user = this.authClient.getUser();

    // Update desktop auth toggle
    if (authToggle) {
      const textEl = authToggle.querySelector('.text');

      if (isAuthenticated) {
        authToggle.classList.add('authenticated');
        authToggle.classList.remove('loading');
        if (textEl) textEl.textContent = user?.displayName || 'Signed In';
      } else {
        authToggle.classList.remove('authenticated', 'loading');
        if (textEl) textEl.textContent = 'Sign In';
      }
    }

    // Update mobile auth toggle
    if (mobileAuthToggle) {
      const mobileTextEl = mobileAuthToggle.querySelector('.mobile-auth-text');

      if (isAuthenticated) {
        mobileAuthToggle.classList.add('authenticated');
        if (mobileTextEl) mobileTextEl.textContent = user?.displayName || 'Signed In';
      } else {
        mobileAuthToggle.classList.remove('authenticated');
        if (mobileTextEl) mobileTextEl.textContent = 'Sign In';
      }
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

    // Panel navigation buttons
    this.setupPanelNavigation();

    // Mobile functionality
    this.setupMobile();

    // Window resize
    window.addEventListener('resize', () => {
      this.gridManager?.updateDimensions();
      this.handleMobileResize();
    });
  }

  /**
   * Check if device is mobile
   */
  isMobile() {
    return window.innerWidth <= 768;
  }

  /**
   * Setup mobile functionality
   */
  setupMobile() {
    // Mobile panel menu buttons
    const mobileMenuBtns = document.querySelectorAll('.mobile-panel-btn');
    mobileMenuBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const panelId = btn.dataset.panel;
        this.switchMobilePanel(panelId);

        // Update active state on buttons
        mobileMenuBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Mobile auth toggle
    const mobileAuthToggle = document.getElementById('mobileAuthToggle');
    if (mobileAuthToggle) {
      mobileAuthToggle.addEventListener('click', () => {
        if (this.authClient.checkAuthenticated()) {
          if (confirm('Sign out?')) {
            this.authClient.logout();
          }
        } else {
          this.authClient.login();
        }
      });
    }

    // Mobile friends button
    const mobileFriendsBtn = document.getElementById('mobileFriendsBtn');
    const mobileFriendsDrawer = document.getElementById('mobileFriendsDrawer');
    const mobileDrawerBackdrop = document.getElementById('mobileDrawerBackdrop');
    const closeFriendsDrawer = document.getElementById('mobileFriendsClose');

    if (mobileFriendsBtn && mobileFriendsDrawer) {
      // Open friends drawer
      mobileFriendsBtn.addEventListener('click', () => {
        this.openMobileFriendsDrawer();
      });

      // Close via close button
      if (closeFriendsDrawer) {
        closeFriendsDrawer.addEventListener('click', () => {
          this.closeMobileFriendsDrawer();
        });
      }

      // Close via backdrop
      if (mobileDrawerBackdrop) {
        mobileDrawerBackdrop.addEventListener('click', () => {
          this.closeMobileFriendsDrawer();
        });
      }
    }

    // Setup swipe gestures for panel navigation
    this.setupMobileSwipe();

    // Set initial mobile panel if on mobile
    if (this.isMobile()) {
      this.initMobileView();
    }
  }

  /**
   * Setup swipe gestures for mobile panel navigation
   */
  setupMobileSwipe() {
    const grid = document.getElementById('grid');
    if (!grid) return;

    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;

    grid.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    grid.addEventListener('touchend', (e) => {
      if (!this.isMobile()) return;

      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0) {
          // Swiped right - go to previous panel
          this.navigateMobilePanel(-1);
        } else {
          // Swiped left - go to next panel
          this.navigateMobilePanel(1);
        }
      }
    }, { passive: true });
  }

  /**
   * Navigate to adjacent mobile panel
   * @param {number} direction - -1 for previous, 1 for next
   */
  navigateMobilePanel(direction) {
    const visibleBtns = Array.from(document.querySelectorAll('.mobile-panel-btn'))
      .filter(btn => btn.style.display !== 'none');

    if (visibleBtns.length === 0) return;

    // Find current active button
    const currentBtn = visibleBtns.find(btn => btn.classList.contains('active'));
    const currentIndex = currentBtn ? visibleBtns.indexOf(currentBtn) : 0;

    // Calculate new index with wrapping
    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = visibleBtns.length - 1;
    if (newIndex >= visibleBtns.length) newIndex = 0;

    // Switch to new panel
    const newBtn = visibleBtns[newIndex];
    const panelId = newBtn.dataset.panel;

    this.switchMobilePanel(panelId);

    // Update button states
    visibleBtns.forEach(b => b.classList.remove('active'));
    newBtn.classList.add('active');

    // Scroll the button into view
    newBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  /**
   * Handle window resize for mobile/desktop transitions
   */
  handleMobileResize() {
    const wasMobile = document.body.classList.contains('is-mobile');
    const isMobile = this.isMobile();

    if (isMobile && !wasMobile) {
      // Switched to mobile
      this.initMobileView();
    } else if (!isMobile && wasMobile) {
      // Switched to desktop
      this.exitMobileView();
    }
  }

  /**
   * Initialize mobile view
   */
  initMobileView() {
    document.body.classList.add('is-mobile');

    // If logged in, make all panels available
    if (this.authClient.checkAuthenticated()) {
      const allPanels = this.gridManager?.getItems() || [];
      allPanels.forEach(panel => {
        panel.hidden = false;
      });
      this.updateMobileMenuForAuth(true);
    } else {
      this.updateMobileMenuForAuth(false);
    }

    // Activate the first visible panel
    const firstVisibleBtn = Array.from(document.querySelectorAll('.mobile-panel-btn'))
      .find(btn => btn.style.display !== 'none');

    if (firstVisibleBtn) {
      const panelId = firstVisibleBtn.dataset.panel;
      this.switchMobilePanel(panelId);
      document.querySelectorAll('.mobile-panel-btn').forEach(b => b.classList.remove('active'));
      firstVisibleBtn.classList.add('active');
    }

    // Update friends badge
    this.updateMobileFriendsBadge();
  }

  /**
   * Exit mobile view
   */
  exitMobileView() {
    document.body.classList.remove('is-mobile');

    // Remove mobile-active from all cards
    document.querySelectorAll('.card.mobile-active').forEach(card => {
      card.classList.remove('mobile-active');
    });

    // Close friends drawer if open
    this.closeMobileFriendsDrawer();
  }

  /**
   * Switch active mobile panel
   */
  switchMobilePanel(panelId) {
    // Remove mobile-active from all cards
    document.querySelectorAll('.card').forEach(card => {
      card.classList.remove('mobile-active');
    });

    // Add mobile-active to selected panel
    const targetCard = document.querySelector(`.card[data-id="${panelId}"]`);
    if (targetCard) {
      targetCard.classList.add('mobile-active');
      // Ensure the panel is not hidden by gridManager
      targetCard.style.display = '';
    }

    // Also update the panel's hidden state in gridManager
    const panel = this.gridManager?.getItems()?.find(p => p.id === panelId);
    if (panel) {
      panel.hidden = false;
    }
  }

  /**
   * Open mobile friends drawer
   */
  openMobileFriendsDrawer() {
    const drawer = document.getElementById('mobileFriendsDrawer');
    const backdrop = document.getElementById('mobileDrawerBackdrop');

    if (drawer) {
      drawer.classList.add('open');
      // Sync friends list content to mobile drawer
      this.syncMobileFriendsList();
    }
    if (backdrop) {
      backdrop.classList.add('visible');
    }
  }

  /**
   * Close mobile friends drawer
   */
  closeMobileFriendsDrawer() {
    const drawer = document.getElementById('mobileFriendsDrawer');
    const backdrop = document.getElementById('mobileDrawerBackdrop');

    if (drawer) {
      drawer.classList.remove('open');
    }
    if (backdrop) {
      backdrop.classList.remove('visible');
    }
  }

  /**
   * Sync friends list to mobile drawer
   */
  syncMobileFriendsList() {
    const desktopFriendsList = document.getElementById('friends-list');
    const mobileFriendsContent = document.getElementById('mobileFriendsList');

    if (desktopFriendsList && mobileFriendsContent) {
      // Clone the friends list content
      mobileFriendsContent.innerHTML = desktopFriendsList.innerHTML;
    }
  }

  /**
   * Update mobile friends badge count
   */
  updateMobileFriendsBadge() {
    const badge = document.getElementById('mobileFriendsCount');
    if (!badge) return;

    // Get online friends count from the friends list
    const onlineFriends = document.querySelectorAll('#friends-list .friend-item.online');
    const count = onlineFriends.length;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.textContent = '0';
    }
  }

  /**
   * Setup panel navigation buttons in card bars
   */
  setupPanelNavigation() {
    // Store navigation callbacks for each panel
    this.panelNavCallbacks = new Map();

    // Setup click handlers for nav buttons
    this.gridEl.addEventListener('click', (e) => {
      const navBtn = e.target.closest('.panel-nav-btn');
      if (!navBtn) return;

      const card = navBtn.closest('.card');
      if (!card) return;

      const panelId = card.dataset.id;
      const action = navBtn.dataset.nav;

      // Call the registered callback for this panel
      const callbacks = this.panelNavCallbacks.get(panelId);
      if (callbacks && callbacks[action]) {
        callbacks[action]();
      }
    });

    // Make panel nav utility available globally
    window.panelNav = {
      /**
       * Show navigation buttons for a panel
       * @param {string} panelId - The panel data-id
       * @param {object} options - { back: callback, home: callback }
       */
      show: (panelId, options = {}) => {
        const card = this.gridEl.querySelector(`[data-id="${panelId}"]`);
        if (!card) return;

        // Store callbacks
        this.panelNavCallbacks.set(panelId, options);

        // Show back button if callback provided
        const backBtn = card.querySelector('[data-nav="back"]');
        if (backBtn) {
          if (options.back) {
            backBtn.classList.add('visible');
          } else {
            backBtn.classList.remove('visible');
          }
        }

        // Show home button if callback provided
        const homeBtn = card.querySelector('[data-nav="home"]');
        if (homeBtn) {
          if (options.home) {
            homeBtn.classList.add('visible');
          } else {
            homeBtn.classList.remove('visible');
          }
        }
      },

      /**
       * Hide navigation buttons for a panel
       * @param {string} panelId - The panel data-id
       */
      hide: (panelId) => {
        const card = this.gridEl.querySelector(`[data-id="${panelId}"]`);
        if (!card) return;

        // Remove callbacks
        this.panelNavCallbacks.delete(panelId);

        // Hide all nav buttons
        card.querySelectorAll('.panel-nav-btn').forEach(btn => {
          btn.classList.remove('visible');
        });
      }
    };
  }

  /**
   * Setup panel selector in header
   */
  setupPanelSelector() {
    const panelSelector = document.getElementById('panelSelector');
    const panelSelectorBtn = document.getElementById('panelSelectorBtn');
    const panelSelectorWrapper = panelSelectorBtn?.closest('.panel-selector-wrapper');

    if (!panelSelector) return;

    // Build the panel selector HTML
    this.buildPanelSelectorHTML();

    // Click-based dropdown toggle
    if (panelSelectorBtn && panelSelectorWrapper) {
      // Toggle dropdown when clicking the "Panels" button
      panelSelectorBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Refresh checkbox states before opening
        this.refreshPanelSelectorState();

        panelSelectorWrapper.classList.toggle('open');
      });

      // Prevent ALL clicks inside the dropdown from closing it or bubbling
      panelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
      });

      // Also prevent mousedown from bubbling (some browsers use this)
      panelSelector.addEventListener('mousedown', (e) => {
        e.stopPropagation();
      });

      // Close dropdown when clicking outside (but not inside dropdown or button)
      document.addEventListener('click', (e) => {
        if (!panelSelectorWrapper.contains(e.target)) {
          panelSelectorWrapper.classList.remove('open');
        }
      });
    }

    // Handle checkbox changes - keep dropdown open while toggling panels
    panelSelector.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        e.stopPropagation();
        e.stopImmediatePropagation();
        const panelId = e.target.dataset.panelId;
        const isChecked = e.target.checked;
        this.gridManager?.toggleItemVisibility(panelId, isChecked);
      }
    });
  }

  /**
   * Build the panel selector HTML structure
   */
  buildPanelSelectorHTML() {
    const panelSelector = document.getElementById('panelSelector');
    if (!panelSelector) return;

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
  }

  /**
   * Refresh panel selector checkbox states to match actual panel visibility
   */
  refreshPanelSelectorState() {
    const panelSelector = document.getElementById('panelSelector');
    if (!panelSelector) return;

    const panels = this.gridManager?.getItems() || [];

    panels.forEach(panel => {
      const checkbox = panelSelector.querySelector(`input[data-panel-id="${panel.id}"]`);
      if (checkbox) {
        checkbox.checked = !panel.hidden;
      }
    });
  }

  /**
   * Setup drag and drop
   */
  setupDragDrop() {
    let startMouse = null;
    let grabOffset = null; // Offset from card's top-left where user grabbed

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

      // Calculate where on the card the user grabbed (offset from card's top-left)
      const cardRect = cardEl.getBoundingClientRect();
      grabOffset = {
        x: e.clientX - cardRect.left,
        y: e.clientY - cardRect.top
      };

      item.el.classList.add('dragging');
      e.preventDefault();
    });

    // Mouse move during drag
    window.addEventListener('mousemove', (e) => {
      if (!this.dragging) return;

      const deltaX = e.clientX - startMouse.x;
      const deltaY = e.clientY - startMouse.y;

      this.dragging.el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

      // Use grab offset to calculate correct drop position
      const dropPos = this.gridManager.getDropPosition(e.clientX, e.clientY, this.dragging, grabOffset);
      this.gridManager.previewDrop(dropPos.x, dropPos.y, this.dragging);
    });

    // Mouse up to commit drag
    window.addEventListener('mouseup', (e) => {
      if (!this.dragging) return;

      const dropPos = this.gridManager.getDropPosition(e.clientX, e.clientY, this.dragging, grabOffset);
      this.gridManager.commitDrag(dropPos.x, dropPos.y, this.dragging);

      this.dragging.el.classList.remove('dragging');
      this.dragging.el.style.transform = '';
      this.dragging = null;
      grabOffset = null;
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

      // Resolve any collisions caused by resize
      this.gridManager.resolveResizeCollisions(this.resizing);

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

    // Create tab editor modal
    this.createTabEditorModal();

    // Render tabs
    this.renderTabs();
  }

  /**
   * Create tab editor modal
   */
  createTabEditorModal() {
    // Remove existing modal if any
    const existing = document.getElementById('tabEditorModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tabEditorModal';
    modal.className = 'tab-editor-modal';
    modal.innerHTML = `
      <div class="tab-editor-content">
        <div class="tab-editor-header">
          <h3>Edit Layout</h3>
          <button class="tab-editor-close">&times;</button>
        </div>
        <div class="tab-editor-body">
          <div class="form-group">
            <label>Layout Name</label>
            <input type="text" id="tabEditorName" class="tab-editor-input" placeholder="Enter layout name">
          </div>
          <div class="form-group">
            <label>Accent Color</label>
            <div class="color-picker-grid">
              <div class="color-option" data-color="#7dd3fc" style="background: #7dd3fc"></div>
              <div class="color-option" data-color="#60a5fa" style="background: #60a5fa"></div>
              <div class="color-option" data-color="#a855f7" style="background: #a855f7"></div>
              <div class="color-option" data-color="#f97316" style="background: #f97316"></div>
              <div class="color-option" data-color="#22c55e" style="background: #22c55e"></div>
              <div class="color-option" data-color="#ef4444" style="background: #ef4444"></div>
              <div class="color-option" data-color="#eab308" style="background: #eab308"></div>
              <div class="color-option" data-color="#ec4899" style="background: #ec4899"></div>
              <div class="color-option" data-color="#14b8a6" style="background: #14b8a6"></div>
              <div class="color-option" data-color="#8b5cf6" style="background: #8b5cf6"></div>
              <div class="color-option" data-color="#f43f5e" style="background: #f43f5e"></div>
              <div class="color-option" data-color="#06b6d4" style="background: #06b6d4"></div>
            </div>
            <div class="custom-color-row">
              <span class="custom-color-label">Custom Color:</span>
              <input type="color" id="tabEditorColor" class="tab-editor-color-input">
              <span class="color-hex-display" id="colorHexDisplay">#7dd3fc</span>
            </div>
          </div>
        </div>
        <div class="tab-editor-footer">
          <button class="tab-editor-delete">Delete Layout</button>
          <div class="tab-editor-actions">
            <button class="tab-editor-cancel">Cancel</button>
            <button class="tab-editor-save">Save</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Setup modal event listeners
    this.setupTabEditorListeners(modal);
  }

  /**
   * Setup tab editor modal listeners
   */
  setupTabEditorListeners(modal) {
    const closeBtn = modal.querySelector('.tab-editor-close');
    const cancelBtn = modal.querySelector('.tab-editor-cancel');
    const saveBtn = modal.querySelector('.tab-editor-save');
    const deleteBtn = modal.querySelector('.tab-editor-delete');
    const colorOptions = modal.querySelectorAll('.color-option');
    const colorInput = modal.querySelector('#tabEditorColor');

    // Close modal
    closeBtn.addEventListener('click', () => this.closeTabEditor());
    cancelBtn.addEventListener('click', () => this.closeTabEditor());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeTabEditor();
    });

    // Color option click
    colorOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        colorInput.value = opt.dataset.color;
        // Update hex display
        const hexDisplay = modal.querySelector('#colorHexDisplay');
        if (hexDisplay) {
          hexDisplay.textContent = opt.dataset.color.toUpperCase();
        }
      });
    });

    // Color input change
    colorInput.addEventListener('input', () => {
      colorOptions.forEach(o => o.classList.remove('selected'));
      // Update hex display
      const hexDisplay = modal.querySelector('#colorHexDisplay');
      if (hexDisplay) {
        hexDisplay.textContent = colorInput.value.toUpperCase();
      }
    });

    // Save
    saveBtn.addEventListener('click', () => this.saveTabEdit());

    // Delete
    deleteBtn.addEventListener('click', () => this.deleteCurrentTab());
  }

  /**
   * Open tab editor
   */
  openTabEditor(tabId) {
    const modal = document.getElementById('tabEditorModal');
    if (!modal) return;

    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Store current editing tab
    modal.dataset.tabId = tabId;

    // Fill form
    const nameInput = modal.querySelector('#tabEditorName');
    const colorInput = modal.querySelector('#tabEditorColor');
    const colorOptions = modal.querySelectorAll('.color-option');
    const deleteBtn = modal.querySelector('.tab-editor-delete');

    nameInput.value = tab.name;
    colorInput.value = tab.color;

    // Update hex display
    const hexDisplay = modal.querySelector('#colorHexDisplay');
    if (hexDisplay) {
      hexDisplay.textContent = tab.color.toUpperCase();
    }

    // Select matching color option
    colorOptions.forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.color === tab.color);
    });

    // Hide delete button if only one tab
    deleteBtn.style.display = this.tabs.length > 1 ? 'block' : 'none';

    // Show modal
    modal.classList.add('active');
  }

  /**
   * Close tab editor
   */
  closeTabEditor() {
    const modal = document.getElementById('tabEditorModal');
    if (modal) {
      modal.classList.remove('active');
      delete modal.dataset.tabId;
    }
  }

  /**
   * Save tab edit
   */
  saveTabEdit() {
    const modal = document.getElementById('tabEditorModal');
    if (!modal) return;

    const tabId = modal.dataset.tabId;
    const nameInput = modal.querySelector('#tabEditorName');
    const colorInput = modal.querySelector('#tabEditorColor');

    const name = nameInput.value.trim() || 'Untitled Layout';
    const color = colorInput.value;

    // Update tab
    const tabIndex = this.tabs.findIndex(t => t.id === tabId);
    if (tabIndex !== -1) {
      this.tabs[tabIndex].name = name;
      this.tabs[tabIndex].color = color;
      this.storageManager.saveTabsMeta(this.tabs);

      // Update accent color if this is active tab
      if (this.activeTabId === tabId) {
        this.setAccentColor(color);
      }

      this.renderTabs();
    }

    this.closeTabEditor();
  }

  /**
   * Delete current tab
   */
  deleteCurrentTab() {
    const modal = document.getElementById('tabEditorModal');
    if (!modal) return;

    const tabId = modal.dataset.tabId;

    if (this.tabs.length <= 1) {
      alert('Cannot delete the last layout');
      return;
    }

    if (!confirm('Are you sure you want to delete this layout?')) {
      return;
    }

    // Delete tab
    this.storageManager.deleteTab(tabId);
    this.tabs = this.tabs.filter(t => t.id !== tabId);

    // Switch to another tab if we deleted the active one
    if (this.activeTabId === tabId) {
      this.setActiveTab(this.tabs[0].id);
    } else {
      this.renderTabs();
    }

    this.closeTabEditor();
  }

  /**
   * Add new tab
   */
  addNewTab() {
    const colors = ['#7dd3fc', '#60a5fa', '#a855f7', '#f97316', '#22c55e', '#ef4444'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newTab = this.storageManager.createTab(`Layout ${this.tabs.length + 1}`, randomColor);
    this.tabs.push(newTab);

    // Switch to the new tab
    this.setActiveTab(newTab.id);
  }

  /**
   * Render tabs
   */
  renderTabs() {
    const tabsEl = document.getElementById('layoutTabs');
    if (!tabsEl) return;

    let html = '<div class="tabs-header">Layouts</div>';

    this.tabs.forEach(tab => {
      const isActive = tab.id === this.activeTabId ? 'active' : '';
      html += `
        <div class="tabRow">
          <div class="colorChip" style="background: ${tab.color}" data-tab="${tab.id}" title="Click to edit"></div>
          <button class="tabBtn ${isActive}" data-tab="${tab.id}">${tab.name}</button>
        </div>
      `;
    });

    // Add button
    html += '<button class="addBtn" id="addTabBtn">+ Add Layout</button>';
    html += '<div class="tabFooter">Drag panels to customize</div>';

    tabsEl.innerHTML = html;

    // Tab click handlers
    tabsEl.querySelectorAll('.tabBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setActiveTab(btn.dataset.tab);
      });
    });

    // Color chip click handlers (to edit) - only when not locked
    tabsEl.querySelectorAll('.colorChip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isLocked) return; // Don't allow editing when locked
        this.openTabEditor(chip.dataset.tab);
      });
    });

    // Add button handler - only when not locked
    const addBtn = tabsEl.querySelector('#addTabBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.isLocked) return; // Don't allow adding when locked
        this.addNewTab();
      });
    }
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

    // Refresh panel selector to match new layout's panel visibility
    this.refreshPanelSelectorState();

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
    if (this.authClient.checkAuthenticated()) {
      // User is logged in - load saved layouts
      this.applyLoggedInState();
    } else {
      // User is logged out - show minimal public layout
      this.applyLoggedOutState();
    }
  }

  /**
   * Apply logged-out state - minimal public layout
   * Shows only Active Rotators and Intel Feed panels
   */
  applyLoggedOutState() {
    document.body.classList.add('logged-out');

    // Hide layout sidebar
    const layoutSidebar = document.querySelector('.layouts-sidebar');
    if (layoutSidebar) layoutSidebar.style.display = 'none';

    // Hide header controls that require auth
    const lockToggle = document.getElementById('lockToggle');
    const panelSelectorWrapper = document.querySelector('.panel-selector-wrapper');
    if (lockToggle) lockToggle.style.display = 'none';
    if (panelSelectorWrapper) panelSelectorWrapper.style.display = 'none';

    // Hide mobile friends button when logged out
    const mobileFriendsBtn = document.getElementById('mobileFriendsBtn');
    if (mobileFriendsBtn) mobileFriendsBtn.style.display = 'none';

    // Panels to show when logged out
    const publicPanels = ['rotators', 'news'];

    // Hide all panels except public ones
    const allPanels = this.gridManager.getItems();
    allPanels.forEach(panel => {
      if (publicPanels.includes(panel.id)) {
        this.gridManager.toggleItemVisibility(panel.id, true);
      } else {
        this.gridManager.toggleItemVisibility(panel.id, false);
      }
    });

    // Update mobile menu to only show public panels
    this.updateMobileMenuForAuth(false);

    // Apply a simple side-by-side layout for the two public panels
    this.applyPublicLayout();

    // If on mobile, activate rotators panel
    if (this.isMobile()) {
      this.switchMobilePanel('rotators');
      const rotatorsBtn = document.querySelector('.mobile-panel-btn[data-panel="rotators"]');
      if (rotatorsBtn) {
        document.querySelectorAll('.mobile-panel-btn').forEach(b => b.classList.remove('active'));
        rotatorsBtn.classList.add('active');
      }
    }
  }

  /**
   * Apply public layout for logged-out users
   * Rotators and Intel Feed side by side
   */
  applyPublicLayout() {
    const items = this.gridManager.getItems();

    items.forEach(item => {
      if (item.id === 'rotators') {
        item.x = 0;
        item.y = 0;
        item.w = 6;
        item.h = 5;
        item.hidden = false;
      } else if (item.id === 'news') {
        item.x = 6;
        item.y = 0;
        item.w = 6;
        item.h = 5;
        item.hidden = false;
      } else {
        item.hidden = true;
      }
    });

    this.gridManager.applyLayout();
  }

  /**
   * Apply logged-in state - restore full functionality
   */
  applyLoggedInState() {
    document.body.classList.remove('logged-out');

    // Show layout sidebar
    const layoutSidebar = document.querySelector('.layouts-sidebar');
    if (layoutSidebar) layoutSidebar.style.display = '';

    // Show header controls
    const lockToggle = document.getElementById('lockToggle');
    const panelSelectorWrapper = document.querySelector('.panel-selector-wrapper');
    if (lockToggle) lockToggle.style.display = '';
    if (panelSelectorWrapper) panelSelectorWrapper.style.display = '';

    // Show mobile friends button when logged in
    const mobileFriendsBtn = document.getElementById('mobileFriendsBtn');
    if (mobileFriendsBtn) mobileFriendsBtn.style.display = '';

    // Update mobile menu to show all panels
    this.updateMobileMenuForAuth(true);

    // Load saved layout (for desktop)
    if (this.activeTabId) {
      const layout = this.storageManager.loadLayout(
        this.activeTabId,
        this.gridManager.getDefaultLayout()
      );
      this.gridManager.restoreLayout(layout);
    }

    // On mobile, ensure all panels are available and activate first one
    if (this.isMobile()) {
      // Make all panels visible (not hidden) so they can be switched to
      const allPanels = this.gridManager.getItems();
      allPanels.forEach(panel => {
        panel.hidden = false;
      });

      // Activate the first panel (Season)
      const firstBtn = document.querySelector('.mobile-panel-btn');
      if (firstBtn) {
        const panelId = firstBtn.dataset.panel;
        this.switchMobilePanel(panelId);
        document.querySelectorAll('.mobile-panel-btn').forEach(b => b.classList.remove('active'));
        firstBtn.classList.add('active');
      }

      // Update friends badge
      this.updateMobileFriendsBadge();
    }

    // Refresh panel selector state
    this.refreshPanelSelectorState();
  }

  /**
   * Update mobile menu based on auth state
   */
  updateMobileMenuForAuth(isLoggedIn) {
    const publicPanels = ['rotators', 'news'];
    const mobileMenuBtns = document.querySelectorAll('.mobile-panel-btn');

    mobileMenuBtns.forEach(btn => {
      const panelId = btn.dataset.panel;
      if (isLoggedIn) {
        // Show all panel buttons
        btn.style.display = '';
      } else {
        // Only show public panel buttons
        if (publicPanels.includes(panelId)) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
        }
      }
    });
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

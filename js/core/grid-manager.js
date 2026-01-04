/**
 * Grid Manager - CSS Grid-based layout system with drag-and-drop
 */

export class GridManager {
  constructor(gridEl, dropHintEl) {
    this.gridEl = gridEl;
    this.dropHintEl = dropHintEl;

    // Grid configuration
    this.COLS = 12;
    this.COLW = 90;
    this.ROWH = 90;
    this.GAP = 14;

    // Items state
    this.items = [];
    this.defaultLayout = [];

    // Callbacks
    this.onLayoutChange = null;

    this.updateDimensions();
  }

  /**
   * Update grid dimensions from CSS variables
   */
  updateDimensions() {
    const styles = getComputedStyle(document.documentElement);
    this.COLS = parseInt(styles.getPropertyValue('--cols')) || 12;
    this.COLW = parseFloat(styles.getPropertyValue('--colW')) || 90;
    this.ROWH = parseFloat(styles.getPropertyValue('--rowH')) || 90;
  }

  /**
   * Initialize items from DOM
   */
  initializeItems() {
    this.items = [...this.gridEl.querySelectorAll('.card')].map(el => ({
      el,
      id: el.dataset.id,
      x: +el.dataset.x || 0,
      y: +el.dataset.y || 0,
      w: +el.dataset.w || 3,
      h: +el.dataset.h || 2,
      hidden: el.classList.contains('hide'),
      minW: +el.dataset.minW || 2,
      minH: +el.dataset.minH || 2,
      maxW: +el.dataset.maxW || this.COLS
    }));

    // Save default layout
    this.defaultLayout = this.items.map(({ id, x, y, w, h, hidden }) => ({
      id, x, y, w, h, hidden
    }));

    this.applyLayout();
  }

  /**
   * Apply current layout to DOM
   */
  applyLayout() {
    this.items.forEach(item => {
      item.el.classList.toggle('hide', !!item.hidden);

      if (!item.hidden) {
        item.el.style.transform = '';
        item.el.style.gridColumn = `${item.x + 1} / span ${item.w}`;
        item.el.style.gridRow = `${item.y + 1} / span ${item.h}`;
      }

      Object.assign(item.el.dataset, {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      });
    });

    this.hideDropHint();

    if (this.onLayoutChange) {
      this.onLayoutChange(this.getLayoutData());
    }
  }

  /**
   * Get current layout data
   */
  getLayoutData() {
    return this.items.map(({ id, x, y, w, h, hidden }) => ({
      id, x, y, w, h, hidden
    }));
  }

  /**
   * Get default layout
   */
  getDefaultLayout() {
    return this.defaultLayout;
  }

  /**
   * Restore layout from data
   */
  restoreLayout(layoutData) {
    for (const item of this.items) {
      const saved = layoutData.find(l => l.id === item.id);
      if (saved) {
        Object.assign(item, {
          x: saved.x,
          y: saved.y,
          w: saved.w,
          h: saved.h,
          hidden: !!saved.hidden
        });
      } else {
        // Use default for new items
        const def = this.defaultLayout.find(d => d.id === item.id);
        if (def) {
          Object.assign(item, def);
        }
      }
    }
    this.applyLayout();
  }

  /**
   * Toggle item visibility
   */
  toggleItemVisibility(itemId, visible) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.hidden = !visible;
      this.applyLayout();
    }
  }

  /**
   * Get drop position from mouse coordinates
   */
  getDropPosition(clientX, clientY, dragItem) {
    const rect = this.gridEl.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    let x = Math.floor(relX / (this.COLW + this.GAP));
    let y = Math.floor(relY / (this.ROWH + this.GAP));

    // Clamp to grid bounds
    x = Math.max(0, Math.min(this.COLS - dragItem.w, x));
    y = Math.max(0, y);

    return { x, y };
  }

  /**
   * Preview drop position with collision resolution
   */
  previewDrop(x, y, dragItem) {
    // Create placeholder
    const placeholder = {
      id: '__placeholder__',
      x,
      y,
      w: dragItem.w,
      h: dragItem.h
    };

    // Get clones of other items
    const clones = this.items
      .filter(i => i !== dragItem && !i.hidden)
      .map(i => ({ id: i.id, x: i.x, y: i.y, w: i.w, h: i.h }));

    // Resolve collisions
    this.resolveCollisions(placeholder, clones);

    // Show drop hint
    this.showDropHint(x, y, dragItem.w, dragItem.h);

    // Preview positions
    clones.forEach(clone => {
      const item = this.items.find(i => i.id === clone.id);
      if (item && !item.hidden) {
        item.el.style.gridColumn = `${clone.x + 1} / span ${clone.w}`;
        item.el.style.gridRow = `${clone.y + 1} / span ${clone.h}`;
      }
    });
  }

  /**
   * Commit drag operation
   */
  commitDrag(x, y, dragItem) {
    dragItem.x = x;
    dragItem.y = y;

    // Create placeholder
    const placeholder = {
      id: '__placeholder__',
      x,
      y,
      w: dragItem.w,
      h: dragItem.h
    };

    // Get clones of other items
    const clones = this.items
      .filter(i => i !== dragItem && !i.hidden)
      .map(i => ({ id: i.id, x: i.x, y: i.y, w: i.w, h: i.h }));

    // Resolve collisions and apply
    this.resolveCollisions(placeholder, clones);

    clones.forEach(clone => {
      const item = this.items.find(i => i.id === clone.id);
      if (item) {
        item.x = clone.x;
        item.y = clone.y;
      }
    });

    this.applyLayout();
  }

  /**
   * Resolve collisions by pushing items down
   */
  resolveCollisions(placeholder, clones) {
    const blockers = [...clones, placeholder];
    let changed = true;
    let iterations = 0;
    const maxIterations = 500;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      // Sort by position (top-left first)
      blockers.sort((a, b) => (a.y - b.y) || (a.x - b.x));

      for (const item of clones) {
        for (const blocker of blockers) {
          if (blocker === item) continue;

          if (this.rectsOverlap(item, blocker)) {
            // Push below the blocker
            item.y = blocker.y + blocker.h;
            changed = true;
          }
        }
      }
    }
  }

  /**
   * Check if two rectangles overlap
   */
  rectsOverlap(a, b) {
    if (!a || !b) return false;
    return !(
      a.x + a.w <= b.x ||
      b.x + b.w <= a.x ||
      a.y + a.h <= b.y ||
      b.y + b.h <= a.y
    );
  }

  /**
   * Clamp item to grid columns
   */
  clampToCols(item) {
    if (item.x + item.w > this.COLS) {
      item.x = this.COLS - item.w;
    }
    if (item.x < 0) item.x = 0;
  }

  /**
   * Show drop hint at position
   */
  showDropHint(x, y, w, h) {
    this.dropHintEl.classList.add('active');
    this.dropHintEl.style.gridColumn = `${x + 1} / span ${w}`;
    this.dropHintEl.style.gridRow = `${y + 1} / span ${h}`;
  }

  /**
   * Hide drop hint
   */
  hideDropHint() {
    this.dropHintEl.classList.remove('active');
  }

  /**
   * Add new item to grid
   */
  addItem(config) {
    const {
      id,
      title,
      content,
      x = 0,
      y = 0,
      w = 4,
      h = 3
    } = config;

    // Find empty position if not specified
    const position = this.findEmptyPosition(w, h, x, y);

    // Create element
    const el = document.createElement('section');
    el.className = 'card';
    el.dataset.id = id;
    el.dataset.x = position.x;
    el.dataset.y = position.y;
    el.dataset.w = w;
    el.dataset.h = h;

    el.innerHTML = `
      <div class="bar">
        <div class="title">${title}</div>
        <div class="handle">⋮⋮</div>
      </div>
      <div class="content" id="${id}-content">${content || ''}</div>
      <div class="resize" aria-hidden="true"></div>
    `;

    this.gridEl.appendChild(el);

    const item = {
      el,
      id,
      x: position.x,
      y: position.y,
      w,
      h,
      hidden: false,
      minW: 2,
      minH: 2,
      maxW: this.COLS
    };

    this.items.push(item);
    this.applyLayout();

    return item;
  }

  /**
   * Find empty position for new item
   */
  findEmptyPosition(w, h, preferX = 0, preferY = 0) {
    // Try preferred position first
    if (!this.hasCollision(preferX, preferY, w, h)) {
      return { x: preferX, y: preferY };
    }

    // Scan for empty position
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x <= this.COLS - w; x++) {
        if (!this.hasCollision(x, y, w, h)) {
          return { x, y };
        }
      }
    }

    // Fallback: place at bottom
    const maxY = Math.max(...this.items.map(i => i.y + i.h), 0);
    return { x: 0, y: maxY };
  }

  /**
   * Check if position has collision
   */
  hasCollision(x, y, w, h) {
    const testRect = { x, y, w, h };
    return this.items.some(item =>
      !item.hidden && this.rectsOverlap(item, testRect)
    );
  }

  /**
   * Remove item from grid
   */
  removeItem(itemId) {
    const index = this.items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      const item = this.items[index];
      item.el.remove();
      this.items.splice(index, 1);
      this.applyLayout();
    }
  }

  /**
   * Get item by ID
   */
  getItem(itemId) {
    return this.items.find(i => i.id === itemId);
  }

  /**
   * Get all items
   */
  getItems() {
    return this.items;
  }

  /**
   * Get visible items
   */
  getVisibleItems() {
    return this.items.filter(i => !i.hidden);
  }

  /**
   * Get grid statistics
   */
  getStats() {
    return {
      totalItems: this.items.length,
      visibleItems: this.items.filter(i => !i.hidden).length,
      hiddenItems: this.items.filter(i => i.hidden).length,
      gridWidth: this.COLS,
      maxRow: Math.max(...this.items.map(i => i.y + i.h), 0)
    };
  }

  /**
   * Compact layout (remove vertical gaps)
   */
  compactLayout() {
    // Sort by position
    const visible = this.items
      .filter(i => !i.hidden)
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));

    visible.forEach(item => {
      // Try to move up
      while (item.y > 0) {
        item.y--;
        if (this.hasCollisionExcept(item.x, item.y, item.w, item.h, item.id)) {
          item.y++;
          break;
        }
      }
    });

    this.applyLayout();
  }

  /**
   * Check collision excluding specific item
   */
  hasCollisionExcept(x, y, w, h, excludeId) {
    const testRect = { x, y, w, h };
    return this.items.some(item =>
      item.id !== excludeId &&
      !item.hidden &&
      this.rectsOverlap(item, testRect)
    );
  }
}

export default GridManager;

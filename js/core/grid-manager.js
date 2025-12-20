/**
 * Grid Manager - Extracted from sick-on-tuesday dashboard
 * Handles grid layout, positioning, collision detection, and reflow
 */

export class GridManager {
  constructor(gridElement, dropHintElement) {
    this.gridEl = gridElement;
    this.dropHintEl = dropHintElement;

    // Initialize grid properties from CSS custom properties
    this.COLS = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 12;
    this.COLW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--colW')) || 90;
    this.ROWH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rowH')) || 90;

    // Items will be set externally
    this.items = [];
    this.onLayoutChange = null; // callback for when layout changes
  }

  /**
   * Initialize grid with card elements
   */
  initializeItems() {
    this.items = [...this.gridEl.querySelectorAll('.card')].map(el => ({
      el,
      id: el.dataset.id,
      x: +el.dataset.x,
      y: +el.dataset.y,
      w: +el.dataset.w,
      h: +el.dataset.h,
      hidden: false,
      minW: 1,
      minH: 1,
      maxW: this.COLS
    }));

    return this.items;
  }

  /**
   * Get default layout snapshot
   */
  getDefaultLayout() {
    return this.items.map(({id, x, y, w, h, hidden}) => ({id, x, y, w, h, hidden}));
  }

  /**
   * Apply layout positions to DOM elements
   */
  applyLayout() {
    this.items.forEach(item => {
      item.el.classList.toggle('hide', !!item.hidden);
      if (!item.hidden) {
        item.el.style.transform = ''; // clear any drag transform
        item.el.style.gridColumn = `${item.x + 1} / span ${item.w}`;
        item.el.style.gridRow = `${item.y + 1} / span ${item.h}`;
      }
      // Update data attributes for persistence
      Object.assign(item.el.dataset, {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      });
    });

    // Notify layout changed
    if (this.onLayoutChange) {
      this.onLayoutChange(this.getLayoutData());
    }
  }

  /**
   * Get current layout data for persistence
   */
  getLayoutData() {
    return this.items.map(({id, x, y, w, h, hidden}) => ({id, x, y, w, h, hidden}));
  }

  /**
   * Restore layout from saved data
   */
  restoreLayout(layoutData, defaultLayout = null) {
    const fallbackLayout = defaultLayout || this.getDefaultLayout();

    for (const item of this.items) {
      const savedPos = layoutData.find(x => x.id === item.id);
      if (savedPos) {
        Object.assign(item, {
          x: savedPos.x,
          y: savedPos.y,
          w: savedPos.w,
          h: savedPos.h,
          hidden: !!savedPos.hidden
        });
      } else {
        const defaultPos = fallbackLayout.find(x => x.id === item.id);
        Object.assign(item, defaultPos || {x: 0, y: 0, w: 3, h: 2, hidden: false});
      }
    }

    this.applyLayout();
  }

  // ========== Collision Detection & Layout Resolution ==========

  /**
   * Check if two rectangles overlap
   */
  rectsOverlap(rectA, rectB) {
    if (!rectA || !rectB || rectA.hidden || rectB.hidden) return false;
    return !(
      rectA.x + rectA.w <= rectB.x ||
      rectB.x + rectB.w <= rectA.x ||
      rectA.y + rectA.h <= rectB.y ||
      rectB.y + rectB.h <= rectA.y
    );
  }

  /**
   * Create shallow clones of item positions (excluding specified item)
   */
  clonePositions(excludeItem) {
    return this.items
      .filter(item => item !== excludeItem && !item.hidden)
      .map(item => ({
        id: item.id,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h
      }));
  }

  /**
   * Convert array to Map for fast lookups
   */
  toMap(posArray) {
    const map = new Map();
    posArray.forEach(pos => map.set(pos.id, pos));
    return map;
  }

  /**
   * Resolve collisions by pushing items down
   * Given a placeholder and existing items, push items down to avoid overlaps
   */
  resolveWithPlaceholder(placeholder, itemClones) {
    const blockers = itemClones.concat([placeholder]);
    let changed = true;
    let guardCounter = 0;

    while (changed && guardCounter < 500) {
      changed = false;
      guardCounter++;

      // Sort by Y then X so pushes cascade top-down
      blockers.sort((a, b) => (a.y - b.y) || (a.x - b.x));

      for (const item of itemClones) {
        for (const blocker of blockers) {
          if (blocker === item) continue;

          if (this.rectsOverlap(item, blocker)) {
            // Push item directly below the blocker
            item.y = blocker.y + blocker.h;
            changed = true;
          }
        }
      }
    }

    return itemClones;
  }

  /**
   * Apply temporary layout positions to DOM (for live preview during drag/resize)
   */
  applyTempLayout(tempPositionMap, draggingItem = null) {
    for (const item of this.items) {
      if (item.hidden) continue;
      if (draggingItem && item.id === draggingItem.id) continue; // Skip dragging item (uses transform)

      const tempPos = tempPositionMap.get(item.id);
      const x = tempPos ? tempPos.x : item.x;
      const y = tempPos ? tempPos.y : item.y;
      const w = tempPos ? tempPos.w : item.w;
      const h = tempPos ? tempPos.h : item.h;

      item.el.style.gridColumn = `${x + 1} / span ${w}`;
      item.el.style.gridRow = `${y + 1} / span ${h}`;
    }
  }

  /**
   * Clamp item position and size to grid bounds
   */
  clampToCols(item) {
    if (item.w > this.COLS) item.w = this.COLS;
    if (item.x < 0) item.x = 0;
    if (item.x + item.w > this.COLS) item.x = this.COLS - item.w;
    if (item.y < 0) item.y = 0;
  }

  // ========== Drag & Drop Support ==========

  /**
   * Calculate drop position from mouse coordinates
   */
  getDropPosition(mouseX, mouseY, draggedItem) {
    const gridRect = this.gridEl.getBoundingClientRect();
    const relativeX = mouseX - gridRect.left;
    const relativeY = mouseY - gridRect.top;

    const col = Math.round(relativeX / (this.COLW + parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gap')) || 14));
    const row = Math.round(relativeY / this.ROWH);

    return {
      x: Math.max(0, Math.min(this.COLS - draggedItem.w, col)),
      y: Math.max(0, row)
    };
  }

  /**
   * Show drop hint at specified position
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
   * Preview drop position with collision resolution
   */
  previewDrop(targetX, targetY, draggedItem) {
    // Create placeholder at target position
    const placeholder = {
      id: '__placeholder__',
      x: targetX,
      y: targetY,
      w: draggedItem.w,
      h: draggedItem.h,
      hidden: false
    };

    // Get clones of other items and resolve collisions
    const clones = this.resolveWithPlaceholder(placeholder, this.clonePositions(draggedItem));
    const tempMap = this.toMap(clones);

    // Show drop hint
    this.showDropHint(placeholder.x, placeholder.y, placeholder.w, placeholder.h);

    // Apply temporary layout
    this.applyTempLayout(tempMap, draggedItem);

    return { placeholder, resolvedPositions: tempMap };
  }

  /**
   * Commit drag operation - update positions permanently
   */
  commitDrag(targetX, targetY, draggedItem) {
    // Create final placeholder and resolve positions
    const placeholder = {
      id: '__placeholder__',
      x: targetX,
      y: targetY,
      w: draggedItem.w,
      h: draggedItem.h,
      hidden: false
    };

    const clones = this.resolveWithPlaceholder(placeholder, this.clonePositions(draggedItem));
    const finalMap = this.toMap(clones);

    // Update dragged item position
    draggedItem.x = placeholder.x;
    draggedItem.y = placeholder.y;
    this.clampToCols(draggedItem);

    // Update other items from resolved positions
    for (const item of this.items) {
      if (item === draggedItem || item.hidden) continue;

      const resolvedPos = finalMap.get(item.id);
      if (resolvedPos) {
        item.x = resolvedPos.x;
        item.y = resolvedPos.y;
      }
    }

    // Apply final layout and hide hint
    this.hideDropHint();
    this.applyLayout();
  }

  // ========== Utility Methods ==========

  /**
   * Find item by ID
   */
  findItemById(id) {
    return this.items.find(item => item.id === id);
  }

  /**
   * Toggle item visibility
   */
  toggleItemVisibility(id, visible = null) {
    const item = this.findItemById(id);
    if (!item) return false;

    item.hidden = visible !== null ? !visible : !item.hidden;
    this.applyLayout();
    return true;
  }

  /**
   * Update grid dimensions (responsive breakpoints)
   */
  updateDimensions() {
    this.COLS = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--cols')) || 12;
    this.COLW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--colW')) || 90;
    this.ROWH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rowH')) || 90;
  }

  /**
   * Get grid statistics
   */
  getStats() {
    const visibleItems = this.items.filter(item => !item.hidden);
    const totalArea = visibleItems.reduce((sum, item) => sum + (item.w * item.h), 0);
    const maxY = Math.max(0, ...visibleItems.map(item => item.y + item.h));

    return {
      totalItems: this.items.length,
      visibleItems: visibleItems.length,
      totalArea,
      gridHeight: maxY,
      efficiency: totalArea / (this.COLS * maxY) || 0
    };
  }
}

// Export utility functions for standalone use
export const GridUtils = {
  rectsOverlap(rectA, rectB) {
    if (!rectA || !rectB) return false;
    return !(
      rectA.x + rectA.w <= rectB.x ||
      rectB.x + rectB.w <= rectA.x ||
      rectA.y + rectA.h <= rectB.y ||
      rectB.y + rectB.h <= rectA.y
    );
  },

  clampToGrid(x, y, w, h, maxCols = 12) {
    const clampedW = Math.min(w, maxCols);
    const clampedX = Math.max(0, Math.min(x, maxCols - clampedW));
    const clampedY = Math.max(0, y);

    return { x: clampedX, y: clampedY, w: clampedW, h: Math.max(1, h) };
  }
};
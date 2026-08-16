/**
 * src/game/renderQueue.ts
 *
 * Milestone 1: Pixel Viewport & Rendering Pipeline
 * Features:
 * - F05: Zero-GC Y-Sorted Render Queue with 6 semantic layers
 * - F06: 3/4 Perspective depth sorting & wall splitting support
 * - F07: Headless Canvas Guard (Node.js authoritative server safe)
 */

export const enum RenderLayer {
  Ground = 0,     // Floor tiles, terrain, floor decals, bloodstains, craters
  Shadow = 1,     // Ground contact drop shadows
  YSorted = 2,    // Walls front face, props, characters, monsters, deployables, pickups, melee slashes
  Overhead = 3,   // Wall tops, roof overhangs, canopy, high decor
  AirborneFX = 4, // Flying shells, lobbed projectiles, tracers, sparks, smoke puffs
  ScreenUI = 5,   // Floating combat text, minimap, HUD, screen overlays
}

export type DrawCallback<T = any> = (ctx: CanvasRenderingContext2D, target: T) => void;
export type SimpleDrawCallback = (ctx: CanvasRenderingContext2D) => void;

export interface RenderItem<T = any> {
  layer: RenderLayer;
  sortY: number;
  tieBreaker: number;
  draw: DrawCallback<T>;
  target: T;
}

export interface RenderQueueConfig {
  initialCapacity?: number; // Total initial items across layers (default 2048)
}

export interface IRenderQueue {
  clear(): void;
  push<T>(
    layer: RenderLayer,
    sortY: number,
    draw: DrawCallback<T> | SimpleDrawCallback,
    target?: T,
    tieBreaker?: number
  ): void;
  pushItem(item: { layer: RenderLayer; sortY: number; draw: SimpleDrawCallback; tieBreaker?: number }): void;
  flush(ctx: CanvasRenderingContext2D | null, onLightingMask?: (ctx: CanvasRenderingContext2D) => void): void;
  flushWorld(ctx: CanvasRenderingContext2D | null, onLightingMask?: (ctx: CanvasRenderingContext2D) => void): void;
  flushScreenUI(ctx: CanvasRenderingContext2D | null): void;
  getCount(layer?: RenderLayer): number;
  isEmpty(): boolean;
}

export class RenderQueue implements IRenderQueue {
  public static readonly LAYER_COUNT = 6;

  private buckets: RenderItem[][];
  private counts: Int32Array;
  private totalPushed = 0;

  constructor(initialCapacity = 2048) {
    const bucketCap = Math.max(128, Math.floor(initialCapacity / RenderQueue.LAYER_COUNT));
    this.buckets = new Array(RenderQueue.LAYER_COUNT);
    this.counts = new Int32Array(RenderQueue.LAYER_COUNT);

    for (let i = 0; i < RenderQueue.LAYER_COUNT; i++) {
      const b: RenderItem[] = new Array(bucketCap);
      for (let j = 0; j < bucketCap; j++) {
        b[j] = {
          layer: i as RenderLayer,
          sortY: 0,
          tieBreaker: 0,
          draw: RenderQueue.noopDraw,
          target: null,
        };
      }
      this.buckets[i] = b;
    }
  }

  private static noopDraw(_ctx: CanvasRenderingContext2D, _target: any): void {}

  /**
   * Resets all layer item counts to 0 with zero heap allocations.
   */
  public clear(): void {
    this.counts.fill(0);
    this.totalPushed = 0;
  }

  /**
   * Pushes a drawable item to the appropriate render layer without per-frame GC allocations.
   */
  public push<T>(
    layer: RenderLayer,
    sortY: number,
    draw: DrawCallback<T> | SimpleDrawCallback,
    target: T = null as unknown as T,
    tieBreaker?: number
  ): void {
    const l = (layer >= 0 && layer < RenderQueue.LAYER_COUNT) ? layer : RenderLayer.YSorted;
    const count = this.counts[l];
    let bucket = this.buckets[l];

    if (count >= bucket.length) {
      // Geometric capacity expansion (doubling) to prevent buffer overflows
      const newCap = bucket.length * 2;
      const newBucket = new Array<RenderItem>(newCap);
      for (let i = 0; i < count; i++) newBucket[i] = bucket[i];
      for (let i = count; i < newCap; i++) {
        newBucket[i] = {
          layer: l,
          sortY: 0,
          tieBreaker: 0,
          draw: RenderQueue.noopDraw,
          target: null,
        };
      }
      this.buckets[l] = newBucket;
      bucket = newBucket;
    }

    const item = bucket[count];
    item.layer = l;
    item.sortY = sortY;
    item.tieBreaker = tieBreaker !== undefined ? tieBreaker : this.totalPushed++;
    item.draw = draw as DrawCallback;
    item.target = target;

    this.counts[l] = count + 1;
  }

  /**
   * Convenience push helper matching simple item interface.
   */
  public pushItem(item: { layer: RenderLayer; sortY: number; draw: SimpleDrawCallback; tieBreaker?: number }): void {
    this.push(item.layer, item.sortY, item.draw, null, item.tieBreaker);
  }

  /**
   * Flushes all 6 layers (0 to 5) in semantic order.
   */
  public flush(ctx: CanvasRenderingContext2D | null, onLightingMask?: (ctx: CanvasRenderingContext2D) => void): void {
    if (!ctx) {
      this.clear();
      return;
    }

    this.flushWorld(ctx, onLightingMask);
    this.flushScreenUI(ctx);
    this.clear();
  }

  /**
   * Flushes World-space layers (Layer 0 Ground, Layer 1 Shadow, Layer 2 YSorted, Layer 3 Overhead, Dynamic Lighting, Layer 4 AirborneFX).
   * Note: Does NOT clear counts automatically so caller can flush ScreenUI separately if needed.
   */
  public flushWorld(ctx: CanvasRenderingContext2D | null, onLightingMask?: (ctx: CanvasRenderingContext2D) => void): void {
    if (!ctx) {
      this.clear();
      return;
    }

    // 1. Layer 0: Ground (FIFO)
    this.flushBucket(ctx, RenderLayer.Ground);

    // 2. Layer 1: Shadow (FIFO)
    this.flushBucket(ctx, RenderLayer.Shadow);

    // 3. Layer 2: YSorted (In-place sort by sortY & tieBreaker)
    const yCount = this.counts[RenderLayer.YSorted];
    if (yCount > 1) {
      this.sortYSorted(this.buckets[RenderLayer.YSorted], 0, yCount - 1);
    }
    this.flushBucket(ctx, RenderLayer.YSorted);

    // 4. Layer 3: Overhead (FIFO)
    this.flushBucket(ctx, RenderLayer.Overhead);

    // Dynamic Lighting Mask composite between Layer 3 and Layer 4
    if (onLightingMask) {
      try {
        onLightingMask(ctx);
      } catch (err) {
        // Safe guard against callback exceptions
      }
    }

    // 5. Layer 4: AirborneFX (FIFO)
    this.flushBucket(ctx, RenderLayer.AirborneFX);
  }

  /**
   * Flushes Screen-space UI layer (Layer 5 ScreenUI).
   */
  public flushScreenUI(ctx: CanvasRenderingContext2D | null): void {
    if (!ctx) {
      this.clear();
      return;
    }

    // 6. Layer 5: ScreenUI (FIFO)
    this.flushBucket(ctx, RenderLayer.ScreenUI);
  }

  private flushBucket(ctx: CanvasRenderingContext2D, layer: RenderLayer): void {
    const bucket = this.buckets[layer];
    const count = this.counts[layer];
    for (let i = 0; i < count; i++) {
      const item = bucket[i];
      item.draw(ctx, item.target);
      // Clean target reference to prevent retaining object graph references
      item.target = null;
    }
  }

  /**
   * In-place Hybrid InsertionSort / 3-Way QuickSort with stable tie-breaking.
   * Zero heap allocations.
   */
  private sortYSorted(arr: RenderItem[], left: number, right: number): void {
    if (right - left <= 16) {
      this.insertionSort(arr, left, right);
      return;
    }

    // 3-Way QuickSort Partition
    const pivotIdx = (left + right) >> 1;
    const pivotY = arr[pivotIdx].sortY;
    const pivotTie = arr[pivotIdx].tieBreaker;

    let i = left;
    let lt = left;
    let gt = right;

    while (i <= gt) {
      const cur = arr[i];
      const cmp = cur.sortY !== pivotY ? cur.sortY - pivotY : cur.tieBreaker - pivotTie;
      if (cmp < 0) {
        this.swap(arr, lt++, i++);
      } else if (cmp > 0) {
        this.swap(arr, i, gt--);
      } else {
        i++;
      }
    }

    if (left < lt - 1) this.sortYSorted(arr, left, lt - 1);
    if (gt + 1 < right) this.sortYSorted(arr, gt + 1, right);
  }

  private insertionSort(arr: RenderItem[], left: number, right: number): void {
    for (let i = left + 1; i <= right; i++) {
      const key = arr[i];
      const keyY = key.sortY;
      const keyTie = key.tieBreaker;
      let j = i - 1;
      while (j >= left) {
        const prev = arr[j];
        const cmp = prev.sortY !== keyY ? prev.sortY - keyY : prev.tieBreaker - keyTie;
        if (cmp <= 0) break;
        arr[j + 1] = prev;
        j--;
      }
      arr[j + 1] = key;
    }
  }

  private swap(arr: RenderItem[], i: number, j: number): void {
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  public getCount(layer?: RenderLayer): number {
    if (layer !== undefined) {
      return (layer >= 0 && layer < RenderQueue.LAYER_COUNT) ? this.counts[layer] : 0;
    }
    let total = 0;
    for (let i = 0; i < RenderQueue.LAYER_COUNT; i++) total += this.counts[i];
    return total;
  }

  public isEmpty(): boolean {
    for (let i = 0; i < RenderQueue.LAYER_COUNT; i++) {
      if (this.counts[i] > 0) return false;
    }
    return true;
  }
}

export function createRenderQueue(capacity = 2048): RenderQueue {
  return new RenderQueue(capacity);
}

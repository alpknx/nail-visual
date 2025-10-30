// src/lib/batchLoader.ts

import type { ProProfile } from "./api";

type BatchItem<K, V> = {
  key: K;
  resolve: (value: V) => void;
  reject: (error: unknown) => void;
};

/**
 * Простой batch loader для группировки запросов
 * Используется для загрузки профилей мастеров batch'ем вместо отдельных запросов
 */
export class BatchLoader<K, V> {
  private queue: BatchItem<K, V>[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private batchFn: (keys: K[]) => Promise<Map<K, V>>;
  private batchSize: number;
  private batchDelayMs: number;

  constructor(
    batchFn: (keys: K[]) => Promise<Map<K, V>>,
    options: { batchSize?: number; delayMs?: number } = {}
  ) {
    this.batchFn = batchFn;
    this.batchSize = options.batchSize ?? 20;
    this.batchDelayMs = options.delayMs ?? 10;
  }

  async load(key: K): Promise<V> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Если достигли размера batch — обрабатываем сразу
      if (this.queue.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.timeoutId) {
        // Иначе ждём небольшую задержку
        this.timeoutId = setTimeout(() => this.processBatch(), this.batchDelayMs);
      }
    });
  }

  private async processBatch() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    const keys = batch.map((item) => item.key);

    try {
      const results = await this.batchFn(keys);

      for (const item of batch) {
        const value = results.get(item.key);
        if (value !== undefined) {
          item.resolve(value);
        } else {
          item.reject(new Error(`No result for key: ${item.key}`));
        }
      }
    } catch (error) {
      for (const item of batch) {
        item.reject(error);
      }
    }
  }
}

/**
 * Batch loader для профилей мастеров
 * Группирует несколько запросов за профилями в один
 */
export const proBatchLoader = new BatchLoader(
  async (proIds: string[]) => {
    const res = await fetch(
      `/api/pros/batch?ids=${proIds.join(",")}`,
      { cache: "force-cache" }
    );
    if (!res.ok) throw new Error("Failed to fetch pro profiles");
    
    const data = await res.json();
    const map = new Map<string, ProProfile>();
    
    if (Array.isArray(data.data)) {
      data.data.forEach((pro: ProProfile) => {
        map.set(pro.id, pro);
      });
    }
    
    return map;
  },
  { batchSize: 20, delayMs: 10 }
);

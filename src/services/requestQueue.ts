/**
 * Request Queue Service
 * Prevents Firebase 500 errors by rate-limiting concurrent DB writes,
 * adding exponential backoff on failure, and deduplicating rapid submissions.
 */

type QueueTask<T> = {
  id: string;
  fn: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
  retries: number;
};

class RequestQueue {
  private queue: QueueTask<unknown>[] = [];
  private running = 0;
  private readonly maxConcurrent: number;
  private readonly maxRetries: number;
  private readonly baseDelay: number;

  constructor(maxConcurrent = 3, maxRetries = 3, baseDelay = 300) {
    this.maxConcurrent = maxConcurrent;
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  enqueue<T>(id: string, fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Deduplicate: if same id is already queued, skip adding again
      const existing = this.queue.find(t => t.id === id);
      if (existing) {
        existing.resolve = resolve as (v: unknown) => void;
        existing.reject = reject;
        return;
      }
      this.queue.push({ id, fn: fn as () => Promise<unknown>, resolve: resolve as (v: unknown) => void, reject, retries: 0 });
      this.drain();
    });
  }

  private drain() {
    while (this.running < this.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.running++;
      this.run(task);
    }
  }

  private async run<T>(task: QueueTask<T>) {
    try {
      const result = await task.fn();
      task.resolve(result);
    } catch (err) {
      if (task.retries < this.maxRetries && this.isRetryable(err)) {
        task.retries++;
        const delay = this.baseDelay * Math.pow(2, task.retries - 1) + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));
        this.queue.unshift(task as unknown as QueueTask<unknown>); // re-queue at front
      } else {
        task.reject(err);
      }
    } finally {
      this.running--;
      this.drain();
    }
  }

  private isRetryable(err: unknown): boolean {
    if (err instanceof Error) {
      const msg = err.message.toLowerCase();
      // Retry on network errors, 500s, rate limits
      return msg.includes('network') || msg.includes('500') || msg.includes('unavailable')
        || msg.includes('timeout') || msg.includes('too-many-requests') || msg.includes('quota');
    }
    return false;
  }

  get pendingCount() { return this.queue.length; }
  get activeCount() { return this.running; }
}

// Singleton queue for all DB writes
export const dbQueue = new RequestQueue(3, 3, 300);

// Singleton queue for reads (higher concurrency allowed)
export const dbReadQueue = new RequestQueue(6, 2, 150);

/**
 * Wrap any Firebase write in the queue to prevent overload.
 * Usage: await queuedWrite('unique-op-id', () => set(ref(db, path), data))
 */
export function queuedWrite<T>(id: string, fn: () => Promise<T>): Promise<T> {
  return dbQueue.enqueue(id, fn);
}

/**
 * Wrap any Firebase read in the read queue.
 */
export function queuedRead<T>(id: string, fn: () => Promise<T>): Promise<T> {
  return dbReadQueue.enqueue(id, fn);
}

/**
 * Exponential backoff retry for one-off operations (no queue).
 */
export async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 300): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

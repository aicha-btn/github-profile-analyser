import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readCachedAnalysis, writeCachedAnalysis } from './analysisCache'
import { createPortfolioAnalysis } from '../test/fixtures'

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

class UnavailableStorage implements Storage {
  get length(): number {
    throw new Error('Storage unavailable')
  }

  clear(): void {
    throw new Error('Storage unavailable')
  }

  getItem(): string | null {
    throw new Error('Storage unavailable')
  }

  key(): string | null {
    throw new Error('Storage unavailable')
  }

  removeItem(): void {
    throw new Error('Storage unavailable')
  }

  setItem(): void {
    throw new Error('Storage unavailable')
  }
}

const CACHE_KEY = 'github-analyzer:analysis:fixture-developer:quick'

function updateStoredEnvelope(
  storage: MemoryStorage,
  update: (envelope: Record<string, unknown>) => void,
): void {
  const rawValue = storage.getItem(CACHE_KEY)
  if (!rawValue) {
    throw new Error('Expected a cached value.')
  }

  const envelope = JSON.parse(rawValue) as Record<string, unknown>
  update(envelope)
  storage.setItem(CACHE_KEY, JSON.stringify(envelope))
}

describe('analysis cache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-22T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a clean miss when no cache exists', () => {
    expect(readCachedAnalysis('fixture-developer', 'quick', new MemoryStorage())).toBeNull()
  })

  it('saves and reads the same valid analysis', () => {
    const storage = new MemoryStorage()
    const analysis = createPortfolioAnalysis('quick')
    const saved = writeCachedAnalysis('fixture-developer', 'quick', analysis, storage)
    const cached = readCachedAnalysis('fixture-developer', 'quick', storage)

    expect(saved.metadata.cachedAt).toBe('2026-10-22T12:00:00.000Z')
    expect(cached).toEqual({
      ...saved,
      metadata: {
        ...saved.metadata,
        fromCache: true,
      },
    })
  })

  it('ignores and removes corrupt JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem(CACHE_KEY, '{not-json')

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).toBeNull()
    expect(storage.getItem(CACHE_KEY)).toBeNull()
  })

  it('ignores and removes a cache with an invalid analysis schema', () => {
    const storage = new MemoryStorage()
    writeCachedAnalysis('fixture-developer', 'quick', createPortfolioAnalysis('quick'), storage)
    updateStoredEnvelope(storage, (envelope) => {
      envelope.analysis = { invalid: true }
    })

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).toBeNull()
    expect(storage.getItem(CACHE_KEY)).toBeNull()
  })

  it('ignores and removes an incompatible cache version', () => {
    const storage = new MemoryStorage()
    writeCachedAnalysis('fixture-developer', 'quick', createPortfolioAnalysis('quick'), storage)
    updateStoredEnvelope(storage, (envelope) => {
      envelope.version = 2
    })

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).toBeNull()
    expect(storage.getItem(CACHE_KEY)).toBeNull()
  })

  it('ignores and removes an entry older than six hours', () => {
    const storage = new MemoryStorage()
    writeCachedAnalysis('fixture-developer', 'quick', createPortfolioAnalysis('quick'), storage)
    updateStoredEnvelope(storage, (envelope) => {
      envelope.cachedAt = '2026-10-22T05:59:59.000Z'
    })

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).toBeNull()
    expect(storage.getItem(CACHE_KEY)).toBeNull()
  })

  it('ignores and removes a future-dated entry', () => {
    const storage = new MemoryStorage()
    writeCachedAnalysis('fixture-developer', 'quick', createPortfolioAnalysis('quick'), storage)
    updateStoredEnvelope(storage, (envelope) => {
      envelope.cachedAt = '2026-10-22T12:00:01.000Z'
    })

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).toBeNull()
    expect(storage.getItem(CACHE_KEY)).toBeNull()
  })

  it('returns a valid entry younger than six hours', () => {
    const storage = new MemoryStorage()
    writeCachedAnalysis('fixture-developer', 'quick', createPortfolioAnalysis('quick'), storage)
    vi.setSystemTime(new Date('2026-10-22T17:59:59Z'))

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)?.metadata.fromCache).toBe(true)
  })

  it('keeps quick and deep cache entries separate', () => {
    const storage = new MemoryStorage()
    writeCachedAnalysis('fixture-developer', 'quick', createPortfolioAnalysis('quick'), storage)

    expect(readCachedAnalysis('fixture-developer', 'deep', storage)).toBeNull()
    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).not.toBeNull()
  })

  it('does not break the application when storage is unavailable', () => {
    const storage = new UnavailableStorage()
    const analysis = createPortfolioAnalysis('quick')

    expect(readCachedAnalysis('fixture-developer', 'quick', storage)).toBeNull()
    expect(writeCachedAnalysis('fixture-developer', 'quick', analysis, storage)).toMatchObject({
      source: 'github',
      metadata: { depth: 'quick', fromCache: false },
    })
  })
})

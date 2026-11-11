import { afterEach, describe, expect, it, vi } from 'vitest'
import { newId } from './browser'

describe('newId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses randomUUID on a secure page', () => {
    expect(newId()).toMatch(/^[0-9a-f-]{36}$/)
  })

  // A phone on the dev server over plain http has no randomUUID.
  it('falls back to getRandomValues when randomUUID is missing', () => {
    const { getRandomValues } = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: getRandomValues.bind(globalThis.crypto) })
    const a = newId()
    const b = newId()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toBe(b)
  })
})

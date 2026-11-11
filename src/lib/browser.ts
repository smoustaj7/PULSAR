/** Browser APIs that need a secure page (HTTPS or localhost), with fallbacks for when it isn't. */

/**
 * A random id for a new reading. `crypto.randomUUID` exists only on secure pages (HTTPS or
 * localhost), so a phone opening the dev server over plain http on the local network gets
 * 128 random bits from `crypto.getRandomValues`, which works everywhere.
 */
export function newId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Copy text to the clipboard. The Clipboard API also needs a secure page; elsewhere this
 * falls back to selecting the text in a hidden field and copying it. Resolves false when
 * neither works.
 */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Permission refused: try the fallback below.
    }
  }
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.cssText = 'position:fixed;opacity:0;pointer-events:none'
  // Outside an open modal dialog everything is inert and can't be selected, so the field
  // goes inside the topmost one.
  const host = [...document.querySelectorAll('dialog[open]')].at(-1) ?? document.body
  host.append(field)
  field.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    field.remove()
  }
}

/**
 * Safely truncate a string to a maximum length without breaking emoji or multi-byte characters
 * Uses Intl.Segmenter when available, falls back to Array.from for older browsers
 */
export function safeTruncate(s: string, max: number): string {
  if (s.length <= max) return s

  // Use Intl.Segmenter for proper grapheme cluster handling if available
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' })
      const segments = Array.from(segmenter.segment(s))

      if (segments.length <= max) return s

      return segments
        .slice(0, max)
        .map((seg) => seg.segment)
        .join('')
    } catch (error) {
      // Fall through to Array.from fallback
      console.warn('Intl.Segmenter failed, using fallback:', error)
    }
  }

  // Fallback: use Array.from to handle basic Unicode code points
  const chars = Array.from(s)
  if (chars.length <= max) return s

  return chars.slice(0, max).join('')
}

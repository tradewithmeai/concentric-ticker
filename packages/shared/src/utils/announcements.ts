/**
 * Utility to announce messages to screen readers via live regions
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcements = document.getElementById('announcements')
  if (announcements) {
    // Clear any existing content first
    announcements.textContent = ''

    // Set new content after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      announcements.textContent = message
      announcements.setAttribute('aria-live', priority)
    }, 100)

    // Clear the announcement after 5 seconds to avoid clutter
    setTimeout(() => {
      announcements.textContent = ''
    }, 5000)
  }
}

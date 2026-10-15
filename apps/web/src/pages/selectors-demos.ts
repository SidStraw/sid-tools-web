export const selectorDemos = {
  logical: {
    html: '<main id="garden">\n  <section class="card featured">\n    <h2>Forest notes</h2>\n    <p class="summary">Small, deliberate steps.</p>\n    <a class="action" href="/synthetic-local-only">Read notes</a>\n  </section>\n  <section class="card"><h2>Second study</h2><p>Unhurried.</p></section>\n</main>',
    selectors:
      '.card:is(.featured, #never),\n.card:not(.muted):has(> .summary),\n:where(#garden) .card,\n.card:nth-child(2 of .card),\n.no-match',
  },
  partial: {
    html: '<article id="sample"><img src="/synthetic-canary.png" alt="Not loaded"><script>window.__neverRun = true</script><p class="note">Only structure, never rendered.</p><svg><text>Suppressed</text></svg><input type="checkbox" checked></article>',
    selectors:
      '[src], article:has(script), article:has(svg text), input:checked, .note:hover, p::before, :future-state',
  },
  repair: {
    html: '<table><tr><td class="cell">Implied tbody</table><p>First<p>Second',
    selectors: 'table > tbody > tr .cell, p:first-of-type, :scope > p, .absent',
  },
} as const;

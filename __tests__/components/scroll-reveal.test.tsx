import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ScrollReveal } from '@/components/ScrollReveal'

describe('ScrollReveal', () => {
  it('renders visible fallback markup during the initial server render', () => {
    const markup = renderToStaticMarkup(
      <ScrollReveal delay={0.2} direction="left" distance={80}>
        <section aria-label="Visible landing section">
          <h2>Visible landing section</h2>
          <p>SSR content should remain visible before motion enhancement.</p>
        </section>
      </ScrollReveal>
    )

    expect(markup).toContain('Visible landing section')
    expect(markup).toContain('SSR content should remain visible before motion enhancement.')
    expect(markup).not.toContain('opacity:0')
    expect(markup).not.toContain('transform:translate')
  })
})
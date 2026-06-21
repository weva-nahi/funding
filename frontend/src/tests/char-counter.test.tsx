import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CharCounter } from '@/components/CharCounter'

describe('CharCounter', () => {
  it('renders current/max format', () => {
    render(<CharCounter current={45} max={100} />)
    expect(screen.getByText('45/100')).toBeInTheDocument()
  })

  it('shows muted style under 90% of max', () => {
    render(<CharCounter current={10} max={100} />)
    const el = screen.getByText('10/100')
    expect(el.className).toContain('text-muted-foreground')
  })

  it('shows amber warning style at or above 90% of max', () => {
    render(<CharCounter current={95} max={100} />)
    const el = screen.getByText('95/100')
    expect(el.className).toContain('text-amber-600')
  })

  it('shows red error style when over max', () => {
    render(<CharCounter current={105} max={100} />)
    const el = screen.getByText('105/100')
    expect(el.className).toContain('text-red-600')
  })
})
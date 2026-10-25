import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { ThemeProvider, useTheme } from '@/lib/theme'

// Mirrors AppLayout: re-apply the saved theme whenever it (or setTheme) changes.
function AppliesSavedTheme() {
  const { setTheme } = useTheme()
  useEffect(() => setTheme('light'), [setTheme])
  return <button onClick={() => setTheme('dark')}>Dark</button>
}

describe('ThemeProvider', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  // Regression: picking a theme in Settings was immediately undone until the user pressed Save.
  it('keeps a newly picked theme even when the saved theme is re-applied on change', async () => {
    render(
      <ThemeProvider>
        <AppliesSavedTheme />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('fridgeai.theme')).toBe('dark')
  })
})

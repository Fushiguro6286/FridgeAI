import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '@/lib/auth'
import { renderWithProviders } from '@/test/utils'

function Probe() {
  const { user, login, logout } = useAuth()
  return (
    <>
      <p>{user ? `Hi ${user.display_name}` : 'Signed out'}</p>
      <button onClick={() => login('a@example.com', 'password1')}>Log in</button>
      <button onClick={logout}>Log out</button>
    </>
  )
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  // Regression: login used to save the token but leave the UI signed out until a page reload.
  it('updates the signed-in user right after login and logout, without a reload', async () => {
    const user = { id: 1, email: 'a@example.com', display_name: 'Asha' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 't0k', token_type: 'bearer', user }), { status: 200 }),
    )
    renderWithProviders(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    expect(screen.getByText('Signed out')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByText('Hi Asha')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(await screen.findByText('Signed out')).toBeInTheDocument()
  })
})

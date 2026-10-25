import { createBrowserRouter, Outlet } from 'react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthProvider, RequireAuth } from '@/lib/auth'
import { Login, Register } from '@/pages/Auth'
import { Landing } from '@/pages/Landing'
import { NotFound } from '@/pages/NotFound'

function Root() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '/login', element: <Login /> },
      { path: '/register', element: <Register /> },
      {
        path: '/app',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        // App pages load on demand so the landing page stays light.
        children: [
          { index: true, lazy: async () => ({ Component: (await import('@/pages/Dashboard')).Dashboard }) },
          { path: 'scan', lazy: async () => ({ Component: (await import('@/pages/Scan')).Scan }) },
          { path: 'ingredients', lazy: async () => ({ Component: (await import('@/pages/Ingredients')).Ingredients }) },
          { path: 'recipes', lazy: async () => ({ Component: (await import('@/pages/Recipes')).Recipes }) },
          { path: 'recipes/:id', lazy: async () => ({ Component: (await import('@/pages/RecipeDetail')).RecipeDetail }) },
          { path: 'planner', lazy: async () => ({ Component: (await import('@/pages/Planner')).Planner }) },
          { path: 'shopping', lazy: async () => ({ Component: (await import('@/pages/Shopping')).Shopping }) },
          { path: 'settings', lazy: async () => ({ Component: (await import('@/pages/Settings')).Settings }) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

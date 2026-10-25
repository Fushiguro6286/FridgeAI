import {
  CalendarDays,
  Camera,
  ChefHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Refrigerator,
  Settings,
  ShoppingBasket,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Logo } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useHealth } from '@/hooks/health'
import { usePreferences } from '@/hooks/preferences'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; short: string; icon: LucideIcon; end?: boolean }

export const NAV: NavItem[] = [
  { to: '/app', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/app/scan', label: 'Scan Fridge', short: 'Scan', icon: Camera },
  { to: '/app/ingredients', label: 'My Ingredients', short: 'Pantry', icon: Refrigerator },
  { to: '/app/recipes', label: 'Discover Recipes', short: 'Recipes', icon: ChefHat },
  { to: '/app/planner', label: 'Meal Planner', short: 'Plan', icon: CalendarDays },
  { to: '/app/shopping', label: 'Shopping List', short: 'Shop', icon: ShoppingBasket },
  { to: '/app/settings', label: 'Settings', short: 'Settings', icon: Settings },
]
const MOBILE_TABS = NAV.slice(0, 5)

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
              isActive && 'bg-secondary text-secondary-foreground',
            )
          }
        >
          <Icon className="size-[18px]" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

function StatusBanners() {
  const health = useHealth()
  if (health.isError) {
    return (
      <div role="alert" className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        Can't reach the FridgeAI server. Some features won't work until it's back.
      </div>
    )
  }
  if (health.data?.ai_mock_mode) {
    return (
      <div role="status" className="bg-warn-soft px-4 py-2 text-center text-sm text-warn-foreground">
        <strong>Development mock mode:</strong> scans and recipes are sample data, not real AI results.
      </div>
    )
  }
  if (health.data && !health.data.ai_configured) {
    return (
      <div role="status" className="bg-warn-soft px-4 py-2 text-center text-sm text-warn-foreground">
        AI isn't configured on the server (missing AI_API_KEY). Manual ingredient entry still works.
      </div>
    )
  }
  return null
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const prefs = usePreferences()
  const { setTheme } = useTheme()
  const savedTheme = prefs.data?.theme
  useEffect(() => {
    if (savedTheme) setTheme(savedTheme) // apply the saved theme on any device after sign-in
  }, [savedTheme, setTheme])

  function signOut() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-card/70 px-4 py-6 lg:flex">
        <Logo to="/app" className="mb-8 px-2" />
        <SideNav />
        <div className="mt-auto space-y-3 border-t pt-4">
          <div className="px-2 text-sm">
            <div className="truncate font-medium">{user?.display_name}</div>
            <div className="truncate text-muted-foreground">{user?.email}</div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <Logo to="/app" />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-4">
              <SheetHeader className="px-0">
                <SheetTitle className="font-heading">Menu</SheetTitle>
              </SheetHeader>
              <SideNav onNavigate={() => setMenuOpen(false)} />
              <div className="mt-6 border-t pt-4">
                <p className="mb-2 truncate px-3 text-sm text-muted-foreground">{user?.email}</p>
                <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                  <LogOut /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <StatusBanners />

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>

        {/* Mobile bottom tabs */}
        <nav aria-label="Quick" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="grid grid-cols-5">
            {MOBILE_TABS.map(({ to, short, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn('flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] font-medium text-muted-foreground', isActive && 'text-primary')
                  }
                >
                  <Icon className="size-5" aria-hidden />
                  {short}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}

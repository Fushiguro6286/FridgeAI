import {
  CalendarDays,
  Camera,
  ChefHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Refrigerator,
  Settings,
  ShoppingBasket,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { Logo } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useHealth } from '@/hooks/health'
import { usePreferences, useUpdatePreferences } from '@/hooks/preferences'
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

function SideNav({ onNavigate, dark = false }: { onNavigate?: () => void; dark?: boolean }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3.5 rounded-xl px-4 py-3 text-[0.95rem] font-medium transition-colors',
      dark ? 'text-white/70 hover:bg-white/8 hover:text-white' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      isActive && (dark ? 'bg-white/12 font-semibold text-white' : 'bg-secondary text-secondary-foreground'),
    )
  const item = ({ to, label, icon: Icon, end }: NavItem) => (
    <NavLink key={to} to={to} end={end} onClick={onNavigate} className={link}>
      <Icon className="size-[19px]" aria-hidden />
      {label}
    </NavLink>
  )
  return (
    <nav aria-label="Main" className="space-y-1">
      {NAV.slice(0, -1).map(item)}
      <p className={cn('px-4 pb-1 pt-6 text-[0.7rem] font-semibold uppercase tracking-[0.14em]', dark ? 'text-white/45' : 'text-muted-foreground')}>
        Preferences
      </p>
      {item(NAV[NAV.length - 1])}
    </nav>
  )
}

function initials(name?: string) {
  return (name ?? '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?'
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
  const savePrefs = useUpdatePreferences()
  const { setTheme, resolved } = useTheme()
  const savedTheme = prefs.data?.theme
  useEffect(() => {
    if (savedTheme) setTheme(savedTheme) // apply the saved theme on any device after sign-in
  }, [savedTheme, setTheme])

  function toggleTheme() {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setTheme(next)
    savePrefs.mutate({ theme: next }) // keep it after reload; a failed save only loses the preference
  }

  function signOut() {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground shadow-xl shadow-black/10 lg:flex">
        <div className="px-8 pb-10 pt-8">
          <Logo to="/app" inverted />
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          <SideNav dark />
        </div>
        <div className="space-y-3 border-t border-white/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-terracotta text-sm font-bold text-white" aria-hidden>
              {initials(user?.display_name)}
            </span>
            <div className="min-w-0 text-sm">
              <div className="truncate font-semibold text-white">{user?.display_name}</div>
              <div className="truncate text-xs text-white/55">{user?.email}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex flex-1 items-center justify-between rounded-lg bg-white/8 px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:bg-white/14"
            >
              {resolved === 'dark' ? 'Dark mode' : 'Light mode'}
              {resolved === 'dark' ? <Moon className="size-3.5 text-amber-300" aria-hidden /> : <Sun className="size-3.5 text-amber-400" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-8 place-items-center rounded-lg bg-white/8 text-white/80 transition-colors hover:bg-white/14 hover:text-white"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-white shadow-md lg:hidden">
          <Logo to="/app" inverted className="text-xl [&>span]:size-9" />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="text-white hover:bg-white/10 hover:text-white">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-none bg-sidebar p-4 text-white">
              <SheetHeader className="px-0">
                <SheetTitle className="font-heading text-white">Menu</SheetTitle>
              </SheetHeader>
              <SideNav dark onNavigate={() => setMenuOpen(false)} />
              <div className="mt-6 space-y-1 border-t border-white/10 pt-4">
                <p className="mb-2 truncate px-4 text-sm text-white/60">{user?.email}</p>
                <Button variant="ghost" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={toggleTheme}>
                  {resolved === 'dark' ? <Sun /> : <Moon />} {resolved === 'dark' ? 'Light mode' : 'Dark mode'}
                </Button>
                <Button variant="ghost" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={signOut}>
                  <LogOut /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <StatusBanners />

        <main id="main" className="mx-auto w-full max-w-[78rem] flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-10">
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

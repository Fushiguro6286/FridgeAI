import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  HeartPulse,
  Leaf,
  ListChecks,
  Moon,
  PiggyBank,
  Recycle,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Sunrise,
  Timer,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/common'
import { RecipeArt } from '@/components/RecipeArt'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { STORES } from '@/lib/order'
import { cn } from '@/lib/utils'

const DEMO_INGREDIENTS = [
  { name: 'Tomato', conf: 'high' },
  { name: 'Paneer', conf: 'high' },
  { name: 'Onion', conf: 'high' },
  { name: 'Spinach', conf: 'medium' },
  { name: 'Eggs × 6', conf: 'high' },
  { name: 'Curd', conf: 'medium' },
  { name: 'Green chilli', conf: 'low' },
]

const FLOATING = [
  { emoji: '🍅', label: 'Tomato', className: '-left-8 -top-6' },
  { emoji: '🥚', label: 'Eggs', className: '-right-4 -top-6 sm:-right-8 [animation-delay:1.2s]' },
  { emoji: '🥬', label: 'Spinach', className: '-bottom-6 left-8 [animation-delay:2.1s]' },
  { emoji: '🧀', label: 'Paneer', className: '-bottom-6 -right-4 sm:-right-8 [animation-delay:0.6s]' },
]

const STEPS = [
  { icon: Camera, title: 'Snap your fridge', text: 'Take or upload a photo. FridgeAI suggests the ingredients it can actually see.' },
  { icon: ListChecks, title: 'Review and confirm', text: 'Fix names, add what the camera missed and remove mistakes. Nothing is saved until you confirm.' },
  { icon: ChefHat, title: 'Cook, plan and shop', text: 'Get ranked recipes, a weekly meal plan and a shopping list for only what you are missing.' },
]

const DAY = [
  {
    icon: Sunrise,
    time: '7:30 AM',
    title: 'Breakfast without the guesswork',
    text: 'Half asleep? Open FridgeAI and get a 15-minute breakfast from the eggs, bread and last tomato you already have.',
    tone: 'from-[oklch(0.95_0.05_80)] to-[oklch(0.9_0.07_65)]',
  },
  {
    icon: Briefcase,
    time: '1:00 PM',
    title: 'Tiffin ideas from leftovers',
    text: "Turn last night's rice and dal into tomorrow's lunch box instead of throwing them away.",
    tone: 'from-[oklch(0.94_0.04_145)] to-[oklch(0.88_0.06_155)]',
  },
  {
    icon: Moon,
    time: '7:00 PM',
    title: '“What’s for dinner?” sorted',
    text: 'Snap the fridge on the way in. Recipes come ranked by what you have. Missing coriander? Order it in a tap.',
    tone: 'from-[oklch(0.94_0.04_40)] to-[oklch(0.88_0.06_35)]',
  },
  {
    icon: CalendarDays,
    time: 'Sunday',
    title: 'Plan the whole week in a minute',
    text: 'One meal plan, one combined shopping list, inside your budget. No more daily trips for one onion.',
    tone: 'from-[oklch(0.94_0.03_250)] to-[oklch(0.89_0.05_240)]',
  },
]

const BENEFITS = [
  { icon: PiggyBank, title: 'Spend less', text: 'Buy only what is missing, not a second jar of what is already at the back of the shelf.' },
  { icon: Recycle, title: 'Waste less', text: 'Ingredients that need using soon are pushed to the top of every suggestion.' },
  { icon: Timer, title: 'Decide faster', text: 'Skip the 20 minutes of staring into the fridge. Get ideas in seconds.' },
  { icon: HeartPulse, title: 'Eat your way', text: 'Veg, vegan, eggetarian, allergies and dislikes are respected every time.' },
]

const FEATURES = [
  { icon: Sparkles, title: 'Photo ingredient detection', text: 'Vision AI identifies visible food and tells you how sure it is.' },
  { icon: ChefHat, title: 'Recipes from what you have', text: 'Every recipe shows what you have, what is missing and what is optional.' },
  { icon: CalendarDays, title: 'Weekly meal planner', text: 'Breakfast, lunch, dinner and snacks, with less repetition. Swap any meal without touching the rest.' },
  { icon: ShoppingBasket, title: 'Smart shopping list', text: 'Combines quantities across meals and never mixes units that cannot be converted.' },
  { icon: ShoppingCart, title: 'Order what’s missing', text: 'Open each missing item in Blinkit, Zepto, Instamart, BigBasket or JioMart, or send the list to your kirana.' },
  { icon: ShieldCheck, title: 'Respects your diet', text: 'Vegetarian, vegan, eggetarian, allergies and exclusions are applied to every suggestion.' },
  { icon: Wallet, title: 'Fits your week', text: 'Set servings, cooking time and a weekly budget for your household.' },
  { icon: Clock, title: 'Use-soon reminders', text: 'Add expiry dates and see what to cook first, right on your dashboard.' },
]

const EXAMPLES = [
  { title: 'Paneer Bhurji', cuisine: 'North Indian', time: '25 min', have: ['paneer', 'onion', 'tomato'], missing: ['green chilli'] },
  { title: 'Vegetable Pulao', cuisine: 'Indian', time: '35 min', have: ['rice', 'carrot', 'peas', 'onion'], missing: [] },
  { title: 'Tomato Garlic Pasta', cuisine: 'Italian', time: '25 min', have: ['pasta', 'tomato'], missing: ['garlic'] },
]

const ORDER_DEMO = [
  { name: 'Spinach', qty: '250 g' },
  { name: 'Fresh cream', qty: '100 ml' },
  { name: 'Ginger', qty: '1 piece' },
]

function SectionHeading({ eyebrow, title, text, className }: { eyebrow: string; title: string; text?: string; className?: string }) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-terracotta">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-lg text-muted-foreground">{text}</p>}
    </div>
  )
}

export function Landing() {
  const { user } = useAuth()
  return (
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#daily" className="hover:text-foreground">Your day</a>
            <a href="#order" className="hover:text-foreground">Order</a>
            <a href="#features" className="hover:text-foreground">Features</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to="/app">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden sm:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
            <div className="absolute -left-32 -top-24 size-[30rem] rounded-full bg-sage-soft blur-3xl" />
            <div className="absolute -right-24 top-24 size-[26rem] rounded-full bg-warn-soft blur-3xl" />
            <div className="absolute bottom-0 left-1/3 size-72 rounded-full bg-[oklch(0.93_0.04_40)] opacity-60 blur-3xl dark:opacity-20" />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
            <div>
              <Badge variant="sage" className="mb-5 h-7 px-3 text-sm">
                <Leaf aria-hidden /> For Indian and everyday global kitchens
              </Badge>
              <h1 className="text-[2.6rem] font-semibold leading-[1.05] sm:text-6xl lg:text-[4rem]">
                Cook from what's already in your{' '}
                <span className="relative whitespace-nowrap text-primary">
                  fridge
                  <svg className="absolute -bottom-2 left-0 h-3 w-full text-terracotta" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
                    <path d="M2 9 C 50 2, 120 2, 198 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </span>
                .
              </h1>
              <p className="mt-6 font-heading text-xl text-primary sm:text-2xl">Your fridge. Your ingredients. Smarter meals.</p>
              <p className="mt-4 max-w-xl text-lg text-muted-foreground">
                Take a photo of your fridge. FridgeAI picks out the ingredients it can see, you confirm them, and it suggests
                recipes, a weekly meal plan and a shopping list for only what's missing. Order the rest from your favourite app.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6 text-base shadow-lg shadow-primary/20">
                  <Link to="/app/scan">
                    <Camera /> Scan My Fridge
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                  <Link to="/app/recipes">
                    Explore Recipes <ArrowRight />
                  </Link>
                </Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {['Free to start', 'Works without a photo too', 'Respects your diet'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-ok" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual demo: ingredients become recipes */}
            <div className="relative mx-2 sm:mx-6" aria-label="Example: detected ingredients turning into recipe suggestions">
              {FLOATING.map((f) => (
                <span
                  key={f.label}
                  className={cn('animate-float absolute z-10 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm font-medium shadow-lg sm:flex', f.className)}
                  aria-hidden
                >
                  <span className="text-lg leading-none">{f.emoji}</span> {f.label}
                </span>
              ))}
              <div className="relative rounded-3xl border bg-card/95 p-5 shadow-2xl shadow-primary/10 backdrop-blur">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
                      <Camera className="size-4" aria-hidden />
                    </span>
                    Detected in your photo
                  </span>
                  <Badge variant="outline">Example</Badge>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {DEMO_INGREDIENTS.map((i) => (
                    <li key={i.name} className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm">
                      <span
                        className={cn('size-2 rounded-full', i.conf === 'high' ? 'bg-ok' : i.conf === 'medium' ? 'bg-sage' : 'bg-warn')}
                        aria-hidden
                      />
                      {i.name}
                      {i.conf === 'low' && <span className="text-xs text-warn-foreground">check</span>}
                    </li>
                  ))}
                </ul>
                <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-muted-foreground" aria-hidden>
                  <span className="h-px flex-1 bg-border" />
                  <Sparkles className="size-4 text-primary" /> becomes
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { t: 'Paneer Bhurji', m: '4 of 5 in your kitchen', time: '25 min' },
                    { t: 'Palak Paneer', m: '5 of 6 in your kitchen', time: '35 min' },
                  ].map((r) => (
                    <div key={r.t} className="overflow-hidden rounded-xl border bg-background">
                      <RecipeArt title={r.t} size="sm" />
                      <div className="p-3">
                        <div className="font-heading font-semibold">{r.t}</div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{r.m}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" aria-hidden /> {r.time}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-warn-soft px-3 py-2.5 text-sm">
                  <span className="text-warn-foreground">
                    Missing: <strong>green chilli</strong>
                  </span>
                  <span className="flex items-center gap-1 rounded-lg bg-[#f8cb46] px-2.5 py-1 text-xs font-semibold text-[#1c1c1c]">
                    <ShoppingCart className="size-3.5" aria-hidden /> Order
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-16 border-y bg-card/60 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="How it works" title="From fridge to plate in three steps" />
            <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
              <span className="absolute left-[16%] right-[16%] top-[3.1rem] hidden h-px border-t-2 border-dashed border-border md:block" aria-hidden />
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border bg-background p-6 transition-transform hover:-translate-y-1">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-heading text-3xl text-muted-foreground/50">0{i + 1}</span>
                  </div>
                  <h3 className="text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Daily life */}
        <section id="daily" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Made for real days"
            title="A day with FridgeAI"
            text="For students, hostel kitchens, busy professionals and families. Here is where it helps, from the first chai to the last plate."
          />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {DAY.map((d) => (
              <li key={d.title} className="group overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card) transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className={cn('relative flex h-28 items-end justify-between bg-linear-to-br p-4 dark:opacity-85', d.tone)}>
                  <span className="absolute -right-6 -top-6 size-24 rounded-full bg-white/30" aria-hidden />
                  <d.icon className="relative size-9 text-[oklch(0.3_0.04_160)]" strokeWidth={1.6} aria-hidden />
                  <span className="relative rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-[oklch(0.3_0.04_160)]">{d.time}</span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold leading-snug">{d.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{d.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 rounded-3xl border bg-sage-soft/60 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-sm">
                  <b.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-sans text-base font-semibold">{b.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{b.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Order */}
        <section id="order" className="scroll-mt-16 bg-primary py-20 text-primary-foreground">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] opacity-75">Missing something?</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Order what's missing in a few taps</h2>
              <p className="mt-3 text-lg opacity-85">
                Pick your app and FridgeAI opens each missing ingredient right there. Add to cart, pay in the app, and it's on
                its way. Prefer your local kirana? Send them the whole list on WhatsApp.
              </p>
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Supported apps">
                {STORES.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm font-medium">
                    <span className={cn('grid size-6 place-items-center rounded-full text-xs font-bold', s.tint)} aria-hidden>
                      {s.name[0]}
                    </span>
                    {s.name}
                  </li>
                ))}
                <li className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm font-medium">
                  <span className="grid size-6 place-items-center rounded-full bg-[#25d366] text-xs font-bold text-white" aria-hidden>
                    W
                  </span>
                  WhatsApp to kirana
                </li>
              </ul>
              <p className="mt-4 text-xs opacity-70">Store names belong to their owners. FridgeAI is not affiliated with them.</p>
            </div>
            <div className="rounded-3xl bg-card p-5 text-card-foreground shadow-2xl" aria-label="Example order">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-heading text-lg font-semibold">Missing for Palak Paneer</span>
                <Badge variant="outline">Example</Badge>
              </div>
              <div className="mb-3 flex gap-2" aria-hidden>
                {STORES.slice(0, 3).map((s, i) => (
                  <span key={s.id} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium', i === 0 && 'border-primary ring-2 ring-primary/20')}>
                    <span className={cn('grid size-5 place-items-center rounded text-[0.65rem] font-bold', s.tint)}>{s.name[0]}</span>
                    {s.name}
                  </span>
                ))}
              </div>
              <ul className="divide-y rounded-xl border">
                {ORDER_DEMO.map((i) => (
                  <li key={i.name} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <span>
                      <span className="font-medium">{i.name}</span> <span className="text-muted-foreground">{i.qty}</span>
                    </span>
                    <span className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
                      <ExternalLink className="size-3" aria-hidden /> Find on Blinkit
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-muted px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">Then just pay in the app</span>
                <CheckCircle2 className="size-5 text-ok" aria-hidden />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="Features" title="Everything between the fridge and the plate" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-(--shadow-card) transition-all hover:-translate-y-1 hover:border-primary/30">
                <span className="mb-4 grid size-11 place-items-center rounded-xl bg-sage-soft text-primary">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Example recipes */}
        <section id="recipes" className="bg-secondary/50 py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Recipes" title="Recipes that start with your shelf" text="Example cards. Yours are generated from the ingredients you confirm." />
              <Button asChild variant="outline">
                <Link to="/app/recipes">
                  Explore recipes <ArrowRight />
                </Link>
              </Button>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {EXAMPLES.map((r) => (
                <article key={r.title} className="overflow-hidden rounded-2xl border bg-card shadow-(--shadow-card) transition-all hover:-translate-y-1 hover:shadow-xl">
                  <RecipeArt title={r.title} />
                  <div className="p-5">
                    <div className="mb-2 flex gap-1.5">
                      <Badge variant="outline">{r.cuisine}</Badge>
                      <Badge variant="outline">
                        <Clock aria-hidden /> {r.time}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold">{r.title}</h3>
                    <p className="mt-3 text-sm">
                      <span className="font-medium text-ok">You have:</span> {r.have.join(', ')}
                    </p>
                    <p className="mt-1 text-sm">
                      <span className="font-medium text-warn-foreground">Missing:</span> {r.missing.length ? r.missing.join(', ') : 'nothing'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Food waste */}
        <section id="waste" className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <Recycle className="mb-4 size-9 text-primary" aria-hidden />
            <h2 className="text-3xl font-semibold sm:text-4xl">Use it before you lose it</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Mark the spinach that's wilting or the paneer that needs using. FridgeAI puts those first in recipes and meal plans,
              so food gets eaten instead of thrown away.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              'Ingredients marked “use soon” rank recipes higher',
              'Meal plans track how much stock each meal uses',
              'Shopping lists skip what you already have',
              'Unknown quantities are flagged, never assumed unlimited',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:p-12">
            <span className="absolute -right-10 -top-16 size-56 rounded-full bg-white/10" aria-hidden />
            <span className="absolute -bottom-20 right-40 size-40 rounded-full bg-white/5" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-semibold sm:text-4xl">What's for dinner tonight?</h2>
              <p className="mt-2 opacity-85">Open your fridge, take a photo and find out.</p>
            </div>
            <Button asChild size="lg" variant="secondary" className="relative h-12 px-6 text-base">
              <Link to="/app/scan">
                <Camera /> Scan My Fridge
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <div>
            <Logo />
            <p className="mt-2 max-w-xs">Your fridge. Your ingredients. Smarter meals.</p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
            <Link to="/app/scan" className="hover:text-foreground">Scan fridge</Link>
            <Link to="/app/recipes" className="hover:text-foreground">Recipes</Link>
            <Link to="/app/planner" className="hover:text-foreground">Meal planner</Link>
            <Link to="/app/shopping" className="hover:text-foreground">Shopping list</Link>
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <Link to="/register" className="hover:text-foreground">Create account</Link>
          </nav>
        </div>
        <p className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
          AI suggestions can be wrong. FridgeAI does not judge food freshness or safety, and recipes are not guaranteed allergen-free.
        </p>
      </footer>
    </div>
  )
}

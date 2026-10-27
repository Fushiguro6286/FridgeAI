import {
  BellRing,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  ListChecks,
  Package,
  Play,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Truck,
  UtensilsCrossed,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Logo } from '@/components/common'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { STORES } from '@/lib/order'
import { cn } from '@/lib/utils'

const STEPS: { icon: LucideIcon; tone: string; title: string; text: string }[] = [
  {
    icon: Camera,
    tone: 'bg-sage-soft text-primary',
    title: '1. Snap a photo',
    text: 'Open FridgeAI and take a quick picture of your fridge or pantry shelf. The AI lists the ingredients it can see, and you confirm them.',
  },
  {
    icon: WandSparkles,
    tone: 'bg-terracotta/10 text-terracotta',
    title: '2. Get recipes',
    text: 'See what you can cook right now, from simple dal to paneer tikka, matched to your diet, allergies and the time you have.',
  },
  {
    icon: ShoppingCart,
    tone: 'bg-muted text-heading',
    title: '3. Fill the gaps',
    text: 'Missing green chillies or curd? They go on your shopping list, and you can open them in your delivery app in one tap.',
  },
]

const DAY = [
  { time: '7:30 AM', icon: Clock, title: 'Breakfast from leftovers', text: 'A quick poha from last night’s chopped beans and carrots, instead of another plain toast.', img: 'poha' },
  { time: '1:00 PM', icon: Clock, title: 'Tiffin planning', text: 'Lunch-box ideas that stay good for hours, from what is already in the fridge.', img: 'tiffin-meal' },
  { time: '7:00 PM', icon: Clock, title: 'Use-soon dinner', text: 'Spinach expiring tomorrow? Tonight’s suggestions put it first, so it gets cooked, not binned.', img: 'palak-paneer' },
  { time: 'Sunday', icon: CalendarDays, title: 'Weekly prep', text: 'Plan the whole week and get one combined shopping list for the kirana or your app.', img: 'meal-prep' },
]

const BENEFITS = [
  ['Spend less', 'Buy only what’s missing'],
  ['Waste less', 'Use-soon items come first'],
  ['Decide faster', 'Ideas in seconds'],
  ['Eat your way', 'Diet & allergies respected'],
]

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ScanLine, title: 'AI fridge scan', text: 'Vision AI spots dal, spices, paneer and more, and tells you how sure it is.' },
  { icon: Package, title: 'Smart pantry', text: 'Know what’s in stock, how much, and when it expires, without opening every cupboard.' },
  { icon: UtensilsCrossed, title: 'Recipe matching', text: 'Every recipe shows what you have, what’s missing and what’s optional.' },
  { icon: CalendarCheck, title: 'Meal planner', text: 'Breakfast, lunch, dinner and snacks for the week. Swap any meal without redoing the rest.' },
  { icon: ListChecks, title: 'Auto shopping list', text: 'Built from your plan and current stock, with quantities combined across meals.' },
  { icon: Truck, title: 'One-tap ordering', text: 'Open missing items in Blinkit, Zepto or Instamart, or WhatsApp the list to your kirana.' },
  { icon: BellRing, title: 'Expiry reminders', text: 'Items close to their date are pushed to the top of your dashboard and recipes.' },
  { icon: ShieldCheck, title: 'Diet & allergy aware', text: 'Veg, vegan, eggetarian and your allergies and dislikes are applied to every idea.' },
]

const EXAMPLES = [
  { title: 'Kadai Paneer', cuisine: 'North Indian', time: '25 mins', img: 'paneer-curry', match: 95, have: ['Paneer', 'Onion', 'Capsicum'], missing: [] },
  { title: 'Crispy Beetroot Cutlets', cuisine: 'South Indian', time: '25 mins', img: 'cutlets', match: 88, have: ['Beetroot', 'Potato', 'Peanuts'], missing: [] },
  { title: 'Garlic Mushroom Stir Fry', cuisine: 'Indo-Chinese', time: '15 mins', img: 'mushroom-stir-fry', match: 70, have: ['Mushroom', 'Garlic'], missing: ['Spring onion'] },
]

const SPICES = [
  { src: 'star-anise', className: 'top-[22%] -left-8 w-24 opacity-25 [animation-duration:8s]' },
  { src: 'curry-leaf', className: 'bottom-[18%] -right-8 w-32 opacity-25 [animation-duration:10s]' },
  { src: 'cardamom', className: 'top-[70%] left-[30%] w-20 opacity-10 [animation-duration:12s]' },
  { src: 'cinnamon', className: 'top-24 right-[24%] w-16 opacity-15 [animation-duration:9s]' },
]

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <p className={cn('text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground', className)}>{children}</p>
}

export function Landing() {
  const { user } = useAuth()
  const start = user ? '/app' : '/register'
  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {SPICES.map((s) => (
          <img key={s.src} src={`/img/${s.src}.webp`} alt="" className={cn('absolute animate-float', s.className)} />
        ))}
      </div>

      <header className="sticky top-0 z-40 border-b border-sage/50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-8 text-sm font-semibold text-heading/80 md:flex">
            <a href="#how" className="hover:text-heading">How it works</a>
            <a href="#daily" className="hover:text-heading">Your day</a>
            <a href="#order" className="hover:text-heading">Order</a>
            <a href="#features" className="hover:text-heading">Features</a>
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <Button asChild size="lg">
                <Link to="/app">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="hidden rounded text-sm font-semibold text-heading hover:text-terracotta sm:block">
                  Log in
                </Link>
                <Button asChild size="lg">
                  <Link to="/register">Get started free</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-24 pt-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-24">
          <div>
            <span className="inline-block rounded-full bg-sage px-4 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a3c2f]">
              Built for Indian kitchens
            </span>
            <h1 className="mt-7 text-[3rem] font-medium leading-[1.02] sm:text-7xl lg:text-[5rem]">
              Cook from what's{' '}
              <span className="relative inline-block italic text-terracotta">
                already
                <span className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded bg-sage/80" aria-hidden />
              </span>{' '}
              in your fridge.
            </h1>
            <p className="mt-7 max-w-xl text-xl leading-relaxed text-muted-foreground">
              Snap a photo, let AI find your ingredients, and get mouth-watering recipes you can cook right now. Less waste, more taste.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="h-16 rounded-2xl px-8 text-lg">
                <Link to="/app/scan">
                  <Camera className="size-5" /> Scan your fridge
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-16 rounded-2xl border-2 bg-transparent px-8 text-lg text-heading">
                <a href="#how">
                  <Play className="size-4 fill-current" /> See how it works
                </a>
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {['Free to start, no card needed', 'Works without a photo too', 'Respects your diet'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-ok" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-xl" aria-hidden>
            <div className="rounded-[2.5rem] bg-card p-4 shadow-2xl shadow-primary/10 ring-1 ring-border">
              <div className="relative overflow-hidden rounded-[2rem]">
                <img src="/img/palak-paneer-top.webp" alt="" className="aspect-[4/5] w-full object-cover sm:aspect-square" />
                <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-xl bg-white/95 px-4 py-2.5 text-sm font-semibold text-[#1a3c2f] shadow-lg">
                  <span className="size-2 rounded-full bg-green-500" /> Paneer detected
                </div>
                <div className="absolute bottom-5 left-5 rounded-2xl bg-white/95 px-4 py-3 text-[#1a3c2f] shadow-lg">
                  <div className="text-[0.65rem] font-bold uppercase tracking-wider text-[#b85c38]">Ready to cook</div>
                  <div className="font-heading text-lg">Palak Paneer</div>
                  <div className="text-xs text-[#6b6862]">You have 8 of 10 ingredients</div>
                </div>
              </div>
            </div>
            <div className="absolute -right-3 top-1/2 w-40 animate-float rounded-2xl bg-card p-4 shadow-xl ring-1 ring-border sm:-right-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-heading">🍅 Tomato</div>
              <div className="mt-2 h-1.5 rounded-full bg-muted">
                <div className="h-full w-4/5 rounded-full bg-terracotta" />
              </div>
              <div className="mt-2 text-xs font-semibold text-terracotta">Use in 2 days</div>
            </div>
          </div>
        </section>

        {/* Order strip */}
        <section id="order" className="scroll-mt-20 border-y border-border/70 bg-card/80">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <Eyebrow>Missing something?</Eyebrow>
              <h2 className="mt-1 text-2xl font-medium">Order in minutes</h2>
            </div>
            <ul className="flex flex-wrap items-center gap-x-10 gap-y-4">
              {STORES.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-xl font-bold text-muted-foreground/70 transition-colors hover:text-heading">
                  <span className={cn('grid size-7 place-items-center rounded-lg text-sm', s.tint)} aria-hidden>
                    {s.name[0]}
                  </span>
                  {s.name}
                </li>
              ))}
              <li className="flex items-center gap-2 text-xl font-bold text-muted-foreground/70">
                <span className="grid size-7 place-items-center rounded-lg bg-[#25d366] text-sm text-white" aria-hidden>
                  W
                </span>
                Your kirana
              </li>
            </ul>
          </div>
          <p className="pb-6 text-center text-xs text-muted-foreground">
            We're not affiliated with these services. FridgeAI opens each item in the app you choose; you add it to your cart and pay there.
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-medium sm:text-5xl">Magic for your kitchen</h2>
              <p className="mt-4 text-lg text-muted-foreground">Three simple steps from a full fridge to a delicious meal.</p>
            </div>
            <ol className="mt-16 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, tone, title, text }) => (
                <li key={title} className="rounded-3xl border bg-card p-8 shadow-lg shadow-primary/5 transition-transform hover:-translate-y-1">
                  <span className={cn('grid size-16 place-items-center rounded-2xl', tone)}>
                    <Icon className="size-7" aria-hidden />
                  </span>
                  <h3 className="mt-7 text-2xl font-medium">{title}</h3>
                  <p className="mt-4 leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Your day */}
        <section id="daily" className="scroll-mt-20 bg-[#f4f3ee]/80 py-24 dark:bg-card/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="max-w-2xl text-4xl font-medium leading-tight sm:text-5xl">Your personalized meal lifecycle</h2>
            <p className="mt-4 text-lg text-muted-foreground">From morning breakfast to tiffin boxes, we've got your day planned.</p>
            <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {DAY.map(({ time, icon: Icon, title, text, img }) => (
                <li key={time} className="flex flex-col rounded-3xl border bg-card p-6 shadow-lg shadow-primary/5">
                  <div className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-terracotta">
                    <Icon className="size-4" aria-hidden /> {time}
                  </div>
                  <h3 className="mt-4 text-xl font-medium">{title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  <img src={`/img/${img}.webp`} alt="" loading="lazy" className="mt-6 aspect-[3/2] w-full rounded-2xl object-cover" />
                </li>
              ))}
            </ul>
            <ul className="mt-16 grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
              {BENEFITS.map(([title, label]) => (
                <li key={title}>
                  <div className="font-heading text-3xl text-heading sm:text-4xl">{title}</div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 bg-sidebar py-24 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-4xl font-medium text-white sm:text-5xl">Every tool for the home chef</h2>
              <p className="mt-4 text-lg text-white/65">Everything an Indian household needs to plan, cook and shop with less effort.</p>
            </div>
            <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-3xl border border-white/10 bg-white/5 p-8 transition-colors hover:bg-white/8">
                  <Icon className="size-7 text-[#df8a64]" aria-hidden />
                  <h3 className="mt-6 font-sans text-xl font-bold tracking-normal text-white">{title}</h3>
                  <p className="mt-3 leading-relaxed text-white/65">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Recipes */}
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-4xl font-medium sm:text-5xl">
                  Recipes you can cook <span className="italic text-terracotta">right now</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">No supermarket run required. Just your fridge and your stove. (Examples.)</p>
              </div>
              <Link to={start} className="self-start rounded border-b-2 border-terracotta pb-1 font-bold text-heading hover:text-terracotta sm:self-auto">
                Find yours
              </Link>
            </div>
            <ul className="mt-14 grid gap-8 md:grid-cols-3">
              {EXAMPLES.map((r) => (
                <li key={r.title} className="group">
                  <div className="relative overflow-hidden rounded-3xl shadow-lg shadow-primary/10">
                    <img src={`/img/${r.img}.webp`} alt={r.title} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-sm font-semibold text-[#1a3c2f] shadow">
                      <span className={cn('size-2 rounded-full', r.match >= 80 ? 'bg-green-500' : 'bg-amber-500')} /> Match: {r.match}%
                    </span>
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className="text-terracotta">{r.cuisine}</span>
                    <span className="text-muted-foreground">• {r.time}</span>
                  </div>
                  <h3 className="mt-2 text-3xl font-medium">{r.title}</h3>
                  <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                    {r.have.map((i) => (
                      <li key={i} className="rounded-md bg-sage-soft px-2.5 py-1 text-heading">
                        {i}
                      </li>
                    ))}
                    {r.missing.map((i) => (
                      <li key={i} className="rounded-md bg-terracotta/10 px-2.5 py-1 text-terracotta">
                        Missing: {i}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-linear-to-br from-[#eef1ea] to-[#e6ece3] px-6 py-20 text-center dark:from-card dark:to-card">
            <span className="absolute -left-16 -top-16 size-64 rounded-full bg-terracotta/10 blur-2xl" aria-hidden />
            <span className="absolute -bottom-20 -right-16 size-72 rounded-full bg-primary/10 blur-2xl" aria-hidden />
            <h2 className="relative mx-auto max-w-2xl text-4xl font-medium leading-tight sm:text-6xl">Ready to stop wasting and start cooking?</h2>
            <div className="relative mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <Button asChild size="lg" className="h-16 rounded-2xl px-10 text-lg">
                <Link to={start}>{user ? 'Open your dashboard' : 'Get started free'}</Link>
              </Button>
              <span className="font-semibold text-heading">Free to use. No card needed.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative bg-sidebar text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-[2fr_1fr_1fr] lg:px-8">
          <div>
            <Logo inverted />
            <p className="mt-6 max-w-sm leading-relaxed text-white/70">
              Helping Indian households cook smarter, save money and waste less food, with a little help from AI.
            </p>
          </div>
          <div>
            <h2 className="font-sans text-base font-bold tracking-normal text-[#df8a64]">Product</h2>
            <ul className="mt-5 space-y-3 text-white/70">
              <li><a href="#how" className="hover:text-white">How it works</a></li>
              <li><a href="#daily" className="hover:text-white">Your day</a></li>
              <li><a href="#order" className="hover:text-white">Order</a></li>
              <li><a href="#features" className="hover:text-white">Features</a></li>
            </ul>
          </div>
          <div>
            <h2 className="font-sans text-base font-bold tracking-normal text-[#df8a64]">Account</h2>
            <ul className="mt-5 space-y-3 text-white/70">
              <li><Link to="/login" className="hover:text-white">Log in</Link></li>
              <li><Link to="/register" className="hover:text-white">Create account</Link></li>
              <li><Link to="/app/scan" className="hover:text-white">Scan your fridge</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl border-t border-white/10 px-4 py-8 text-xs font-semibold uppercase tracking-wider text-white/45 sm:px-6 lg:px-8">
          © {new Date().getFullYear()} FridgeAI. Recipes are AI-generated; always check labels for allergens.
        </div>
      </footer>
    </div>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Logo } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { loginSchema, registerSchema, type LoginValues, type RegisterValues } from '@/schemas/forms'

function Shell({ title, subtitle, footer, children }: { title: string; subtitle: string; footer: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Logo className="mb-12" />
          <h1 className="text-[2.6rem] font-medium leading-tight">{title}</h1>
          <p className="mb-9 mt-2 text-[1.05rem] text-muted-foreground">{subtitle}</p>
          {children}
          <p className="mt-10 text-center text-sm text-muted-foreground">{footer}</p>
        </div>
      </div>
      <aside className="relative hidden overflow-hidden bg-linear-to-br from-[#25503f] via-[#1a3c2f] to-[#12291f] lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-16">
        <img src="/img/star-anise.webp" alt="" aria-hidden className="absolute -left-6 top-16 w-24 animate-float opacity-25" />
        <img src="/img/curry-leaf.webp" alt="" aria-hidden className="absolute bottom-12 right-10 w-28 animate-float opacity-20 [animation-delay:1.5s]" />
        <div className="w-full max-w-lg rounded-[2rem] bg-white/8 p-2 shadow-2xl shadow-black/30 ring-1 ring-white/10">
          <img src="/img/palak-paneer.webp" alt="A bowl of palak paneer with naan" className="aspect-square w-full rounded-[1.6rem] object-cover" />
        </div>
        <h2 className="mt-12 text-center text-4xl font-medium text-white">“What should I cook tonight?”</h2>
        <p className="mt-4 max-w-md text-center text-lg leading-relaxed text-white/70">
          FridgeAI answers it from what's already in your fridge, before anything goes to waste.
        </p>
        <ul className="mt-10 flex divide-x divide-white/15 text-center">
          {[
            ['Scan', 'Snap your fridge'],
            ['Cook', 'Recipes you can make'],
            ['Order', 'Only what’s missing'],
          ].map(([a, b]) => (
            <li key={a} className="px-7">
              <div className="font-heading text-3xl text-[#df8a64]">{a}</div>
              <div className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white/55">{b}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.ComponentProps<'input'>) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="font-semibold text-heading">
        {label}
      </Label>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        className="h-14 rounded-xl bg-card px-5 text-base shadow-sm"
        {...props}
      />
      {error && (
        <p id={`${id}-err`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

const link = 'font-semibold text-terracotta underline-offset-4 hover:underline'

function useRedirectTarget() {
  const location = useLocation()
  return (location.state as { from?: string } | null)?.from ?? '/app'
}

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const e = form.formState.errors
  if (user) return <Navigate to={target} replace />

  const submit = form.handleSubmit(async (v) => {
    try {
      await login(v.email, v.password)
      navigate(target, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  return (
    <Shell
      title="Welcome back"
      subtitle="Let's see what's in your kitchen today."
      footer={<>New to FridgeAI? <Link className={link} to="/register" state={{ from: target }}>Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-5">
        <Field id="email" label="Email address" type="email" autoComplete="email" placeholder="you@example.com" {...form.register('email')} error={e.email?.message} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" {...form.register('password')} error={e.password?.message} />
        <Button type="submit" size="lg" className="mt-2 h-14 text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </Shell>
  )
}

export function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const target = useRedirectTarget()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { display_name: '', email: '', password: '', confirm: '' },
  })
  const e = form.formState.errors
  if (user) return <Navigate to={target} replace />

  const submit = form.handleSubmit(async (v) => {
    try {
      await register(v.email, v.password, v.display_name)
      toast.success('Account created. Set your food preferences in Settings any time.')
      navigate(target, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    }
  })

  return (
    <Shell
      title="Create your account"
      subtitle="Two minutes now, fewer “what's for dinner?” moments later."
      footer={<>Already have an account? <Link className={link} to="/login" state={{ from: target }}>Log in</Link></>}
    >
      <form onSubmit={submit} noValidate className="grid gap-5">
        <Field id="name" label="Your name" autoComplete="given-name" {...form.register('display_name')} error={e.display_name?.message} />
        <Field id="email" label="Email address" type="email" autoComplete="email" placeholder="you@example.com" {...form.register('email')} error={e.email?.message} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" {...form.register('password')} error={e.password?.message} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" {...form.register('confirm')} error={e.confirm?.message} />
        <Button type="submit" size="lg" className="mt-2 h-14 text-base" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Shell>
  )
}

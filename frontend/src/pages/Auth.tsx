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

function Shell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mb-6 mt-1 text-muted-foreground">{subtitle}</p>
        <div className="rounded-2xl border bg-card p-6 shadow-(--shadow-card)">{children}</div>
      </div>
    </div>
  )
}

function Field({ id, label, error, ...props }: { id: string; label: string; error?: string } & React.ComponentProps<'input'>) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props} />
      {error && (
        <p id={`${id}-err`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

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
    <Shell title="Welcome back" subtitle={<>New here? <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/register" state={{ from: target }}>Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field id="email" label="Email" type="email" autoComplete="email" {...form.register('email')} error={e.email?.message} />
        <Field id="password" label="Password" type="password" autoComplete="current-password" {...form.register('password')} error={e.password?.message} />
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
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
    <Shell title="Create your account" subtitle={<>Already have one? <Link className="font-medium text-primary underline-offset-4 hover:underline" to="/login" state={{ from: target }}>Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <Field id="name" label="Your name" autoComplete="given-name" {...form.register('display_name')} error={e.display_name?.message} />
        <Field id="email" label="Email" type="email" autoComplete="email" {...form.register('email')} error={e.email?.message} />
        <Field id="password" label="Password" type="password" autoComplete="new-password" {...form.register('password')} error={e.password?.message} />
        <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" {...form.register('confirm')} error={e.confirm?.message} />
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </Shell>
  )
}

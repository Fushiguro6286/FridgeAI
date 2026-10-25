import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Keyboard, Loader2, RefreshCw, ScanLine, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { MockBadge, PageHeader } from '@/components/common'
import { IngredientReview, toRows } from '@/components/IngredientReview'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useHealth } from '@/hooks/health'
import { useAddIngredientsBulk } from '@/hooks/inventory'
import { ApiError, errorMessage, uploadWithProgress } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Detection, InventoryInput } from '@/types/api'

const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const EXT = /\.(jpe?g|png|webp)$/i

type Phase = 'pick' | 'preview' | 'uploading' | 'analyzing' | 'review' | 'done'

/** Client-side check for fast feedback. The server re-validates the actual bytes. */
export function checkFile(file: File, maxMb: number): string | null {
  if (!TYPES.includes(file.type) && !EXT.test(file.name)) return 'Please choose a JPG, PNG or WEBP image.'
  if (file.size > maxMb * 1024 * 1024) return `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${maxMb} MB.`
  if (file.size === 0) return 'That file is empty.'
  return null
}

export function Scan() {
  const health = useHealth()
  const maxMb = health.data?.max_upload_mb ?? 8
  const aiReady = health.data ? health.data.ai_configured : true
  const [phase, setPhase] = useState<Phase>('pick')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [detection, setDetection] = useState<Detection | null>(null)
  const [manual, setManual] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [dragging, setDragging] = useState(false)
  const pickRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const bulk = useAddIngredientsBulk()

  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function choose(f: File | undefined | null) {
    if (!f) return
    const problem = checkFile(f, maxMb)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setDetection(null)
    setPhase('preview')
  }

  function reset() {
    abortRef.current?.abort()
    setFile(null)
    setPreview(null)
    setDetection(null)
    setError(null)
    setManual(false)
    setPhase('pick')
  }

  async function analyze() {
    if (!file) return
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError(null)
    setProgress(0)
    setPhase('uploading')
    const form = new FormData()
    form.append('image', file)
    try {
      const result = await uploadWithProgress<Detection>(
        '/api/ingredients/detect',
        form,
        (p) => {
          setProgress(p)
          if (p >= 1) setPhase('analyzing')
        },
        ctrl.signal,
      )
      setDetection(result)
      setPhase('review')
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError(errorMessage(e))
      setPhase('preview')
      if (e instanceof ApiError && e.code === 'ai_not_configured') health.refetch()
    }
  }

  async function confirm(items: InventoryInput[]) {
    try {
      await bulk.mutateAsync(items)
      setSavedCount(items.length)
      toast.success(`Added ${items.length} ingredient${items.length === 1 ? '' : 's'} to My Ingredients`)
      setPhase('done')
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    choose(e.dataTransfer.files?.[0])
  }

  const inputs = (
    <>
      <input ref={pickRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />
    </>
  )

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        <CheckCircle2 className="mx-auto mb-4 size-14 text-ok" aria-hidden />
        <h1 className="text-3xl font-semibold">Ingredients saved</h1>
        <p className="mt-2 text-muted-foreground">
          {savedCount} ingredient{savedCount === 1 ? ' is' : 's are'} now in your inventory.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link to="/app/recipes">Find recipes</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/app/ingredients">View my ingredients</Link>
          </Button>
          <Button size="lg" variant="ghost" onClick={reset}>
            Scan another photo
          </Button>
        </div>
      </div>
    )
  }

  const reviewing = phase === 'review' || manual
  return (
    <div>
      {inputs}
      <PageHeader
        title={reviewing ? 'Review ingredients' : 'Scan your fridge'}
        description={
          reviewing
            ? 'These are suggestions. Edit names, fix quantities, remove mistakes and add anything the photo missed. Nothing is saved until you confirm.'
            : 'Upload a clear photo of your open fridge or pantry shelf. We only list food we can see, and the photo is not stored.'
        }
        actions={
          reviewing ? (
            <Button variant="outline" onClick={reset}>
              <ImagePlus /> Start over
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setManual(true)}>
              <Keyboard /> Enter manually
            </Button>
          )
        }
      />

      {!aiReady && !reviewing && (
        <Alert className="mb-6">
          <AlertTriangle aria-hidden />
          <AlertTitle>Photo scanning isn't available</AlertTitle>
          <AlertDescription>The server has no OpenAI API key configured. You can still add ingredients by hand.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6" role="alert">
          <AlertTriangle aria-hidden />
          <AlertTitle>We couldn't scan that</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {file && (
                <Button size="sm" variant="outline" onClick={analyze}>
                  <RefreshCw /> Retry
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setManual(true)}>
                <Keyboard /> Enter manually
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {reviewing ? (
        <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
          {preview && (
            <div className="lg:sticky lg:top-6 lg:self-start">
              <img src={preview} alt="Your fridge photo" className="w-full rounded-xl border object-cover" />
              {detection?.mock && <MockBadge className="mt-3" />}
              {detection?.model && <p className="mt-2 text-xs text-muted-foreground">Identified by {detection.model}. Confidence is the AI's own estimate, not a measured probability.</p>}
            </div>
          )}
          <div className="space-y-4">
            {detection && detection.ingredients.length === 0 && (
              <Alert>
                <AlertTriangle aria-hidden />
                <AlertTitle>{detection.image_quality === 'no_food' ? 'No food found in this photo' : 'The photo was hard to read'}</AlertTitle>
                <AlertDescription>
                  {detection.message ?? 'Try a brighter, closer photo with the fridge door fully open, or add ingredients below.'}
                </AlertDescription>
              </Alert>
            )}
            {detection?.image_quality === 'unclear' && detection.ingredients.length > 0 && (
              <Alert>
                <AlertTriangle aria-hidden />
                <AlertTitle>Parts of the photo were unclear</AlertTitle>
                <AlertDescription>Check the list carefully and add anything that was missed.</AlertDescription>
              </Alert>
            )}
            <IngredientReview
              key={detection ? 'detected' : 'manual'}
              initial={detection ? toRows(detection.ingredients) : []}
              onConfirm={confirm}
              submitting={bulk.isPending}
            />
          </div>
        </div>
      ) : phase === 'pick' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center rounded-3xl border-2 border-dashed bg-card px-6 py-14 text-center transition-colors',
            dragging ? 'border-primary bg-sage-soft' : 'border-border',
          )}
        >
          <span className="mb-5 grid size-16 place-items-center rounded-2xl bg-sage-soft text-primary">
            <ScanLine className="size-8" aria-hidden />
          </span>
          <h2 className="text-2xl font-semibold">Drop a fridge photo here</h2>
          <p className="mt-1 text-muted-foreground">JPG, PNG or WEBP, up to {maxMb} MB</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button size="lg" onClick={() => pickRef.current?.click()} disabled={!aiReady}>
              <Upload /> Choose photo
            </Button>
            <Button size="lg" variant="outline" onClick={() => cameraRef.current?.click()} disabled={!aiReady}>
              <Camera /> Take photo
            </Button>
          </div>
          <ul className="mt-8 grid max-w-lg gap-1 text-left text-sm text-muted-foreground">
            <li>• Open the door fully and use good light</li>
            <li>• One shelf at a time gives the best results</li>
            <li>• Closed containers can't be identified, so add those by hand</li>
          </ul>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border bg-card">
            {preview && <img src={preview} alt="Selected fridge photo" className={cn('max-h-[60dvh] w-full object-contain', phase !== 'preview' && 'opacity-60')} />}
            {phase === 'preview' && (
              <Button variant="secondary" size="icon" className="absolute right-3 top-3" onClick={reset} aria-label="Remove photo">
                <X />
              </Button>
            )}
            {(phase === 'uploading' || phase === 'analyzing') && (
              <div className="absolute inset-x-0 bottom-0 bg-card/95 p-5" role="status" aria-live="polite">
                <div className="mb-2 flex items-center gap-2 font-medium">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {phase === 'uploading' ? `Uploading… ${Math.round(progress * 100)}%` : 'Identifying ingredients… this can take a few seconds'}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Upload progress">
                  <div className={cn('h-full rounded-full bg-primary transition-all', phase === 'analyzing' && 'animate-pulse')} style={{ width: `${phase === 'analyzing' ? 100 : progress * 100}%` }} />
                </div>
              </div>
            )}
          </div>
          {phase === 'preview' && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => pickRef.current?.click()}>
                <ImagePlus /> Replace photo
              </Button>
              <Button size="lg" onClick={analyze}>
                <ScanLine /> Identify ingredients
              </Button>
            </div>
          )}
          {(phase === 'uploading' || phase === 'analyzing') && (
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={reset}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

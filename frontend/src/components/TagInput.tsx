import { X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

/** Free-text list input: type and press Enter or comma to add; Backspace on empty removes the last tag. */
export function TagInput({
  value,
  onChange,
  placeholder,
  label,
  describedBy,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  label: string
  describedBy?: string
}) {
  const [text, setText] = useState('')
  const id = useId()

  function add(raw: string) {
    const v = raw.trim().slice(0, 60)
    if (v && !value.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...value, v])
    setText('')
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add(text)
    } else if (e.key === 'Backspace' && !text && value.length) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {value.map((t) => (
            <li key={t}>
              <Badge variant="sage" className="gap-1 pr-1 text-sm">
                {t}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((x) => x !== t))}
                  className="rounded-full p-0.5 hover:bg-foreground/10"
                  aria-label={`Remove ${t}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => text && add(text)}
        placeholder={placeholder}
        aria-label={label}
        aria-describedby={describedBy}
      />
    </div>
  )
}

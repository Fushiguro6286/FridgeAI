import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/common'
import { Button } from '@/components/ui/button'

export function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="That page doesn't exist. Let's get you back to the kitchen."
        action={
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        }
      />
    </div>
  )
}

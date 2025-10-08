'use client' // Error components must be Client Components
 
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center text-foreground">
        <div className="rounded-full bg-destructive/10 p-4">
            <div className="rounded-full bg-destructive/20 p-4">
                <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
        </div>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        <Button onClick={() => reset()} className="mt-8">
          Try again
        </Button>
    </div>
  )
}

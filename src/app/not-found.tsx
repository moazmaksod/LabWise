
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileSearch } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center text-foreground">
        <div className="rounded-full bg-primary/10 p-4">
            <div className="rounded-full bg-primary/20 p-4">
                <FileSearch className="h-16 w-16 text-primary" />
            </div>
        </div>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">404 - Page Not Found</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Sorry, we couldn't find the page you were looking for.
        </p>
        <Button asChild className="mt-8">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
    </div>
  )
}

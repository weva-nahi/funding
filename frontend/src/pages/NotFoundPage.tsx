import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl font-extrabold text-primary">404</div>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold
            text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-6xl font-extrabold text-primary">404</div>
        <h1 className="text-2xl font-bold">{t('errors.notFound')}</h1>
        <p className="text-muted-foreground">
          {t('errors.notFoundDesc')}
        </p>
        <Link
          to="/"
          className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold
            text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          {t('errors.backHome')}
        </Link>
      </div>
    </div>
  )
}
import { Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { richatLogo } from '@/lib/sourceLogos'

export function PublicLayout() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={richatLogo} alt="Richat Partners" className="h-8 w-8 rounded-lg object-cover" />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-700 to-teal-500 bg-clip-text text-transparent">Richat</span>
          </Link>
          <nav className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t('auth.login')}</Link>
            <Link to="/register" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">{t('auth.register2')}</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1"><Outlet /></main>
    </div>
  )
}
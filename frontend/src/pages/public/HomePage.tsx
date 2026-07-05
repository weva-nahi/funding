import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Zap, Shield, ArrowRight, Search, FileText, CheckCircle, Database, Users, TrendingUp } from 'lucide-react'
import { useAuthStore } from '@/store'
import { SOURCE_LOGOS } from '@/lib/sourceLogos'

const sources = [
  { key: 'GEF', label: 'GEF' },
  { key: 'GCF', label: 'GCF' },
  { key: 'WORLD_BANK', label: 'World Bank' },
  { key: 'OECD', label: 'OECD' },
]

export function HomePage() {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const stats = [
    { label: t('home.stats.fundingSources'), value: '4', icon: Database },
    { label: t('home.stats.countries'), value: '1', icon: Globe },
    { label: t('home.stats.consultants'), value: '10+', icon: Users },
    { label: t('home.stats.tracking'), value: t('home.stats.trackingValue'), icon: TrendingUp },
  ]

  const howItWorksSteps = [
    { icon: Search, title: t('home.howItWorks.discovery.title'), desc: t('home.howItWorks.discovery.desc') },
    { icon: FileText, title: t('home.howItWorks.applications.title'), desc: t('home.howItWorks.applications.desc') },
    { icon: CheckCircle, title: t('home.howItWorks.support.title'), desc: t('home.howItWorks.support.desc') },
  ]

  const whatWeTrack = [
    { title: t('home.whatWeTrack.grants.title'), desc: t('home.whatWeTrack.grants.desc') },
    { title: t('home.whatWeTrack.concessional.title'), desc: t('home.whatWeTrack.concessional.desc') },
    { title: t('home.whatWeTrack.blended.title'), desc: t('home.whatWeTrack.blended.desc') },
  ]

  const features = [
    { icon: Globe, title: t('home.features.multiSource.title'), desc: t('home.features.multiSource.desc') },
    { icon: Shield, title: t('home.features.consulting.title'), desc: t('home.features.consulting.desc') },
    { icon: Zap, title: t('home.features.notifications.title'), desc: t('home.features.notifications.desc') },
  ]

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L3N2Zz4=')] opacity-40" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
                {t('home.hero.titlePrefix')}
                <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">{t('home.hero.titleHighlight')}</span>
                {t('home.hero.titleSuffix')}
              </h1>
              <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
                {t('home.hero.subtitle')}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:bg-teal-400 transition-all hover:shadow-teal-500/40">
                  {t('home.hero.getStarted')} <ArrowRight className="h-5 w-5" />
                </Link>
                <Link to="/opportunities" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur px-8 py-3.5 text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition-all">
                  {t('home.hero.browseOpportunities')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b py-10 bg-white">
        <div className="container">
          <p className="text-center text-sm font-medium text-muted-foreground mb-6">{t('home.sourcesLabel')}</p>
          <div className="flex flex-wrap justify-center items-center gap-10">
            {sources.map(s => (
              <div key={s.key} className="flex flex-col items-center gap-2 opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                <img src={SOURCE_LOGOS[s.key]} alt={s.label} className="h-12 w-auto object-contain" />
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl bg-white border p-6 text-center shadow-sm">
                <Icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-3xl font-extrabold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">{t('home.howItWorks.title')}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t('home.howItWorks.subtitle')}
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorksSteps.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="relative rounded-2xl bg-muted/50 p-8 hover:shadow-md transition-all group border">
                <div className="absolute -top-4 left-8 h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-sm font-bold">{i + 1}</div>
                <Icon className="h-10 w-10 text-primary mb-4 mt-2 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">{t('home.whatWeTrack.title')}</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t('home.whatWeTrack.subtitle')}
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {whatWeTrack.map(({ title, desc }) => (
              <div key={title} className="rounded-xl bg-white border p-6 shadow-sm">
                <div className="h-2 w-12 bg-gradient-to-r from-teal-500 to-teal-700 rounded-full mb-4" />
                <h3 className="font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">{t('home.features.title')}</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted p-8 hover:shadow-md transition-all">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-800">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t('home.cta.title')}</h2>
          <p className="text-teal-100 mb-8 max-w-xl mx-auto">
            {t('home.cta.subtitle')}
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 transition-all">
            {t('home.cta.button')} <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t py-8 bg-white">
        <div className="container text-center text-sm text-muted-foreground">
          <p>{t('home.footer', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  )
}

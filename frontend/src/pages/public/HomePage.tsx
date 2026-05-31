import { Link } from 'react-router-dom'
import { Globe, Zap, Shield, ArrowRight, Search, FileText, CheckCircle } from 'lucide-react'

const sources = ['GEF', 'GCF', 'World Bank', 'AFD', 'EU', 'OECD']

export function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 py-24 lg:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZyIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48Y2lyY2xlIGN4PSIxIiBjeT0iMSIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiLz48L3N2Zz4=')] opacity-40" />
        <div className="container relative">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-fade-in">
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/20 px-4 py-1.5 text-sm font-medium text-teal-300 ring-1 ring-teal-500/30 mb-6">
                <Zap className="h-3.5 w-3.5" /> Powered by Richat Partners
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Unlock <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">Climate Finance</span> for Mauritania
              </h1>
              <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
                Richat Funding Tracker connects Mauritanian businesses to international climate funding — GEF, GCF, World Bank, AFD, and more. We automate discovery, simplify applications, and track everything.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-teal-500/25 hover:bg-teal-400 transition-all hover:shadow-teal-500/40">
                  Start Free <ArrowRight className="h-5 w-5" />
                </Link>
                <Link to="/opportunities" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur px-8 py-3.5 text-base font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition-all">
                  Browse Opportunities
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="border-b py-8 bg-white">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground mb-4">Aggregating funding from global climate institutions</p>
          <div className="flex flex-wrap justify-center gap-8">
            {sources.map(s => (
              <span key={s} className="text-lg font-bold text-muted-foreground/50 hover:text-primary transition-colors">{s}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">Three simple steps to access international climate financing</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: Search, title: 'Discover', desc: 'Browse curated climate funding opportunities from 7+ international sources, filtered for relevance.' },
              { icon: FileText, title: 'Apply', desc: 'Submit applications with our guided 3-step wizard. Auto-save ensures you never lose progress.' },
              { icon: CheckCircle, title: 'Track', desc: 'Monitor your applications in real-time. Get instant notifications on status changes.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={i} className="relative rounded-2xl bg-white p-8 shadow-sm border hover:shadow-lg transition-all group">
                <div className="absolute -top-4 left-8 h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-sm font-bold">{i + 1}</div>
                <Icon className="h-10 w-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold mb-2">{title}</h3>
                <p className="text-muted-foreground text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Globe, title: 'Opportunity Matching', desc: 'AI-powered matching of your business profile with relevant funding opportunities from global sources.' },
              { icon: Shield, title: 'Expert Consulting', desc: 'Richat Partners provides hands-on guidance to strengthen your applications and maximize success rates.' },
              { icon: Zap, title: 'Real-time Tracking', desc: 'Live notifications, status updates, and deadline reminders so you never miss an opportunity.' },
            ].map(({ icon: Icon, title, desc }, i) => (
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

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-teal-600 to-teal-800">
        <div className="container text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to access climate finance?</h2>
          <p className="text-teal-100 mb-8 max-w-xl mx-auto">Join dozens of Mauritanian businesses already using Richat Funding Tracker to secure international funding.</p>
          <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-teal-700 shadow-lg hover:bg-teal-50 transition-all">
            Create Free Account <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇲🇷' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const currentIndex = LANGUAGES.findIndex(l => l.code === i18n.language?.slice(0, 2))
  const idx = currentIndex === -1 ? 0 : currentIndex
  const current = LANGUAGES[idx]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label={`Language: ${current.label}`}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline text-sm">{current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-44 rounded-xl border bg-white shadow-xl overflow-hidden z-50 animate-fade-in">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left ${
                lang.code === current.code ? 'bg-primary/5 text-primary font-medium' : 'text-foreground'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === current.code && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
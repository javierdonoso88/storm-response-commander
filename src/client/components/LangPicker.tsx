import { useRef, useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Lang } from '../contexts/LanguageContext';

const LANGS: { value: Lang; flag: string; label: string }[] = [
  { value: 'es', flag: '🇪🇸', label: 'ES' },
  { value: 'en', flag: '🇬🇧', label: 'EN' },
  { value: 'pt', flag: '🇵🇹', label: 'PT' },
];

export function LangPicker() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGS.find(l => l.value === lang) ?? LANGS[0];

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-bold"
        style={{
          background: 'var(--bg-secondary)',
          border: open ? '1.5px solid var(--accent)' : '1px solid var(--border)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          boxShadow: open ? '0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
      >
        <span style={{ fontSize: 13 }}>{current.flag}</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{current.label}</span>
        <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor"
          style={{ transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <path d="M0 0l4 5 4-5z"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-[9000]"
          style={{
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-accent)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            minWidth: 110,
          }}
        >
          {LANGS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setLang(opt.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              style={{
                background: lang === opt.value ? 'var(--accent-subtle)' : 'transparent',
                color: lang === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 14 }}>{opt.flag}</span>
              <span className="font-semibold tracking-wide">{opt.label}</span>
              {lang === opt.value && <span className="ml-auto" style={{ color: 'var(--accent)', opacity: 0.8 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

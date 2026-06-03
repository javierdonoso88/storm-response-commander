import { createContext, useContext, useState } from 'react';

export type Lang = 'es' | 'en';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const LanguageContext = createContext<LangCtx>({ lang: 'es', setLang: () => {} });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('src-lang') as Lang;
    return saved === 'en' ? 'en' : 'es';
  });

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('src-lang', l);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

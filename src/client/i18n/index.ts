import { useLanguage } from '../contexts/LanguageContext';
import { es } from './es';
import { en } from './en';
import { pt } from './pt';

export type { Translations } from './es';

export function useT() {
  const { lang } = useLanguage();
  return lang === 'en' ? en : lang === 'pt' ? pt : es;
}

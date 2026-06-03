import { useLanguage } from '../contexts/LanguageContext';
import { es } from './es';
import { en } from './en';

export type { Translations } from './es';

export function useT() {
  const { lang } = useLanguage();
  return lang === 'en' ? en : es;
}

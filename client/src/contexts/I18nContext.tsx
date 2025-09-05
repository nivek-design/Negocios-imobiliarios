import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt-br' | 'en' | 'es';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>('pt-br');
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    // Carregar idioma salvo no localStorage
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['pt-br', 'en', 'es'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Salvar idioma no localStorage e carregar traduções
    localStorage.setItem('language', language);
    loadTranslations(language);
  }, [language]);

  const loadTranslations = async (lang: Language) => {
    try {
      const module = await import(`../locales/${lang}.ts`);
      setTranslations(module.default);
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback para português se falhar
      if (lang !== 'pt-br') {
        const fallbackModule = await import('../locales/pt-br.ts');
        setTranslations(fallbackModule.default);
      }
    }
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}
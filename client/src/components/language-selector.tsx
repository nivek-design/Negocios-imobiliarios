import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n, type Language } from "@/contexts/I18nContext";
import { Globe } from "lucide-react";

export default function LanguageSelector() {
  const { language, setLanguage, t } = useI18n();

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'pt-br', label: t('language.portuguese'), flag: '🇧🇷' },
    { value: 'en', label: t('language.english'), flag: '🇺🇸' },
    { value: 'es', label: t('language.spanish'), flag: '🇪🇸' },
  ];

  return (
    <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
      <SelectTrigger className="w-[140px]" data-testid="select-language">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.value} value={lang.value}>
            <div className="flex items-center space-x-2">
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
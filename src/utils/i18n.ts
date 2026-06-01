import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

type Language = 'zh-CN' | 'en-US';

const locales: Record<Language, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

let currentLang: Language = 'zh-CN';

export function setLanguage(lang: Language): void {
  currentLang = lang;
}

export function t(key: string, params?: Record<string, string>): string {
  let text = locales[currentLang]?.[key] ?? locales['zh-CN']?.[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

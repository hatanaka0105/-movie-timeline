import { useTheme, ThemeType } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();

  const themes: { id: ThemeType; label: { ja: string; en: string }; font: string }[] = [
    { id: 'classic', label: { ja: 'クラシック', en: 'Classic' }, font: 'System' },
    { id: 'cinematic', label: { ja: 'シネマティック', en: 'Cinematic' }, font: 'Playfair' },
    { id: 'modern', label: { ja: 'モダン', en: 'Modern' }, font: 'Inter' },
    { id: 'retro', label: { ja: 'レトロ', en: 'Retro' }, font: 'Bebas' },
  ];

  return (
    <div className="theme-switcher">
      <label className="theme-switcher-label">
        {language === 'ja' ? 'フォント' : 'Font'}
      </label>
      <div className="theme-switcher-buttons">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`theme-button ${theme === t.id ? 'active' : ''}`}
            title={language === 'ja' ? t.label.ja : t.label.en}
          >
            <span className="theme-label">{t.font}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

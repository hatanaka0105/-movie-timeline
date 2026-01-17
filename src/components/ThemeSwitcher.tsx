import { useTheme, ThemeType } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();

  const themes: { id: ThemeType; label: { ja: string; en: string }; icon: string }[] = [
    { id: 'classic', label: { ja: 'クラシック', en: 'Classic' }, icon: '🎬' },
    { id: 'cyberpunk', label: { ja: 'サイバーパンク', en: 'Cyberpunk' }, icon: '🌃' },
    { id: 'minimal', label: { ja: 'ミニマル', en: 'Minimal' }, icon: '⚪' },
    { id: 'glass', label: { ja: 'グラス', en: 'Glass' }, icon: '💎' },
    { id: 'brutal', label: { ja: 'ブルータル', en: 'Brutal' }, icon: '⬛' },
  ];

  return (
    <div className="theme-switcher">
      <label className="theme-switcher-label">
        {language === 'ja' ? 'テーマ' : 'Theme'}
      </label>
      <div className="theme-switcher-buttons">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`theme-button ${theme === t.id ? 'active' : ''}`}
            title={language === 'ja' ? t.label.ja : t.label.en}
          >
            <span className="theme-icon">{t.icon}</span>
            <span className="theme-label">{language === 'ja' ? t.label.ja : t.label.en}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

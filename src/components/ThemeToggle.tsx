import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={isDark ? 'Светлая тема' : 'Тёмная тема'}
      className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-line hover:text-ink"
    >
      {isDark ? '☀' : '☾'}
    </button>
  );
}

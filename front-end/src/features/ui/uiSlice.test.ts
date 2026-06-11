import reducer, {
  setThemeMode,
  toggleThemeMode,
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  type UIState,
} from './uiSlice';
import { lightTheme, darkTheme } from '@/lib/theme';

describe('uiSlice', () => {
  const initial: UIState = {
    themeMode: 'light',
    sidebarCollapsed: false,
  };

  it('returns initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initial);
  });

  it('setThemeMode updates theme', () => {
    expect(reducer(initial, setThemeMode('dark'))).toEqual({ ...initial, themeMode: 'dark' });
  });

  it('toggleThemeMode flips theme', () => {
    expect(reducer(initial, toggleThemeMode())).toEqual({ ...initial, themeMode: 'dark' });
    expect(reducer({ ...initial, themeMode: 'dark' }, toggleThemeMode())).toEqual(initial);
  });

  it('setSidebarCollapsed', () => {
    expect(reducer(initial, setSidebarCollapsed(true))).toEqual({
      ...initial,
      sidebarCollapsed: true,
    });
  });

  it('toggleSidebarCollapsed', () => {
    expect(reducer(initial, toggleSidebarCollapsed())).toEqual({
      ...initial,
      sidebarCollapsed: true,
    });
  });
});

// Also verify the themes are defined
describe('themes', () => {
  it('light and dark themes have different algorithms', () => {
    expect(lightTheme.algorithm).toBeDefined();
    expect(darkTheme.algorithm).toBeDefined();
    expect(lightTheme.algorithm).not.toBe(darkTheme.algorithm);
  });
});

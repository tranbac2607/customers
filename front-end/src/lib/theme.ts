import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export const lightTheme: ThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#1677ff',
    colorInfo: '#1677ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    colorBgLayout: '#f5f7fa',
    colorTextBase: '#1f2937',
    borderRadius: 8,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#001529',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      darkItemBg: '#001529',
      darkItemSelectedBg: '#1677ff',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: '#374151',
      borderColor: '#f0f0f0',
    },
    Card: { borderRadiusLG: 12 },
    Button: { borderRadius: 8, controlHeight: 36 },
    Input: { borderRadius: 8 },
    Select: { borderRadius: 8 },
    DatePicker: { borderRadius: 8 },
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#4096ff',
    colorInfo: '#4096ff',
    colorSuccess: '#73d13d',
    colorWarning: '#ffc53d',
    colorError: '#ff7875',
    colorBgLayout: '#0f172a',
    colorTextBase: '#e2e8f0',
    borderRadius: 8,
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    fontSize: 14,
    wireframe: false,
  },
  components: {
    Layout: {
      headerBg: '#1e293b',
      headerHeight: 64,
      headerPadding: '0 24px',
      siderBg: '#0b1220',
      bodyBg: '#0f172a',
    },
    Menu: {
      darkItemBg: '#0b1220',
      darkItemSelectedBg: '#4096ff',
    },
    Table: {
      headerBg: '#1e293b',
      headerColor: '#cbd5e1',
      borderColor: '#334155',
    },
    Card: { borderRadiusLG: 12 },
    Button: { borderRadius: 8, controlHeight: 36 },
    Input: { borderRadius: 8 },
    Select: { borderRadius: 8 },
    DatePicker: { borderRadius: 8 },
  },
};

export type ThemeMode = 'light' | 'dark';

export const getTheme = (mode: ThemeMode): ThemeConfig =>
  mode === 'dark' ? darkTheme : lightTheme;

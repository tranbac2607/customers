import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export const antdTheme: ThemeConfig = {
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

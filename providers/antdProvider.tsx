'use client';

import { ConfigProvider } from 'antd';
import { CustomizeRenderEmpty } from '@/components/emptyIndicator';
import { tokens } from '@/lib/design-tokens';

const antdTheme = {
  components: {
    Menu: {
      itemSelectedBg: tokens.color.menuSelectedBg,
      itemSelectedColor: tokens.color.textPrimary,
      itemColor: tokens.color.textPrimary,
      itemMarginInline: 8,
    },
    Form: {
      verticalLabelPadding: '0px',
      itemMarginBottom: 12,
    },
    Table: {
      headerBg: tokens.color.tableHeaderBg,
      headerColor: tokens.color.tableHeaderColor,
      fontSize: 12,
    },
    Empty: {},
    Button: {
      fontWeight: tokens.font.weight.bold,
      contentFontSizeLG: 14,
      defaultColor: tokens.color.textPrimary,
      defaultBorderColor: tokens.color.textPrimary,
    },
    Select: {
      colorText: tokens.color.textPrimary,
      colorBorder: tokens.color.borderInput,
    },
    Collapse: {
      headerBg: tokens.color.surfaceCard,
      contentBg: tokens.color.surfaceCard,
    },
  },
  token: {
    colorPrimary: tokens.color.brand,
    colorSuccess: tokens.color.antSuccess,
    colorError: tokens.color.error,
    colorWarning: tokens.color.antWarning,
    borderRadius: tokens.radius.ant,
    fontFamily: tokens.font.family,
  },
};

const AntdConfigProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConfigProvider
      renderEmpty={CustomizeRenderEmpty}
      componentSize="middle"
      theme={antdTheme}
    >
      {children}
    </ConfigProvider>
  );
};

export default AntdConfigProvider;

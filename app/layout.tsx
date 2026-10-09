import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import '@fontsource-variable/public-sans';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import '../styles/tokens.css';
import './globals.css';
import AntdConfigProvider from '@/providers/antdProvider';
import ThemeProvider from '@/providers/ThemeProvider';
import ReactQueryWrapper from '@/providers/reactQueryProvider';
import ConditionalNav from '@/providers/conditionalNav';
import AuthGate from '@/providers/authGate';
import { SuccessBannerProvider } from '@/components/common/notification';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SalesWorkflowProvider } from '@/providers/SalesWorkflowProvider';
import { OrgFiscalSettingsProvider } from '@/providers/OrgFiscalSettingsProvider';
import {
  SALES_WORKFLOW_COOKIE,
  parseSalesWorkflowMode,
  setRequestSalesWorkflowMode,
} from '@/config/salesWorkflow';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Selamnew Business',
  description: 'Selamnew Business',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const salesWorkflowMode = parseSalesWorkflowMode(
    cookies().get(SALES_WORKFLOW_COOKIE)?.value,
  );
  setRequestSalesWorkflowMode(salesWorkflowMode);

  return (
    <html lang="en" data-test="layout" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('crm-theme');document.documentElement.classList.add(t==='dark'?'dark':'light');}catch(e){document.documentElement.classList.add('light');}})();`,
          }}
        />
      </head>
      <body className={cn('font-sans')}>
        {/* <AuthProvider> */}
        <SalesWorkflowProvider mode={salesWorkflowMode}>
          <ReactQueryWrapper>
            <OrgFiscalSettingsProvider>
              <AntdRegistry>
                <AntdConfigProvider>
                  <ThemeProvider>
                    <SuccessBannerProvider>
                      <TooltipProvider>
                        <AuthGate>
                          <ConditionalNav>{children}</ConditionalNav>
                        </AuthGate>
                        <Toaster richColors closeButton position="top-right" />
                      </TooltipProvider>
                      {/* <Nav>{children}</Nav> */}
                    </SuccessBannerProvider>
                  </ThemeProvider>
                </AntdConfigProvider>
              </AntdRegistry>
            </OrgFiscalSettingsProvider>
          </ReactQueryWrapper>
        </SalesWorkflowProvider>
        {/* </AuthProvider> */}
      </body>
    </html>
  );
}

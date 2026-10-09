'use client';

import { tokens } from '@/lib/design-tokens';
import React, { FC, useEffect, useState } from 'react';
import { ConfigProvider, Menu } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarMenuItem } from '@/types/sidebarMenu';

interface SidebarMenuProps {
  menuItems: SidebarMenuItem;
}

const SidebarMenu: FC<SidebarMenuProps> = ({ menuItems }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentItem, setCurrentItem] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024); // Adjust for mobile screen
    };

    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const lastKey = pathSegments[pathSegments.length - 1];
    menuItems.currentItemKey = lastKey;
    setCurrentItem(lastKey);
  }, [pathname, menuItems]);

  const onMenuClick = (e: any) => {
    const key = e['key'] as string;

    router.push(menuItems.findItem(key).link);
  };

  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemHeight: 56,
            itemPaddingInline: 0,
            itemMarginInline: 0,
            itemMarginBlock: 16,
            itemActiveBg: tokens.color.surfaceElevated,
            itemHoverBg: 'rgba(248,248,248,0.92)',
          },
        },
      }}
    >
      <div className={`${isMobile && 'overflow-x-auto w-full '}`}>
        <Menu
          style={isMobile ? { marginInlineStart: 0 } : {}}
          className={`${isMobile ? 'min-w-max flex justify-start bg-[#fafafa]' : ''} rounded-2xl py-2 px-0 sm:px-6 h-max gap-2 sm:w-[300px] `}
          items={menuItems.onlyItems}
          overflowedIndicator={false}
          mode={isMobile ? 'horizontal' : 'inline'}
          selectedKeys={[currentItem]}
          onClick={onMenuClick}
        />
      </div>
    </ConfigProvider>
  );
};

export default SidebarMenu;

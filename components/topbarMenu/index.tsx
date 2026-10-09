'use client';
import React, { FC, useEffect, useState } from 'react';
import { ConfigProvider, Menu } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarMenuItem } from '@/types/sidebarMenu';
import { tokens } from '@/lib/design-tokens';

interface SidebarMenuProps {
  menuItems: SidebarMenuItem;
}

const TopbarMenu: FC<SidebarMenuProps> = ({ menuItems }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [currentItem, setCurrentItem] = useState<string>('');

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
            itemActiveBg: tokens.color.menuSelectedBg,
            itemHoverBg: 'rgba(248,248,248,0.92)',
          },
        },
      }}
    >
      <Menu
        className="w-full flex justify-center sm:justify-end  rounded-2xl py-2 px-6 h-max bg-muted sm:bg-surface-card"
        items={menuItems.onlyItems}
        mode="horizontal"
        selectedKeys={[currentItem]}
        onClick={onMenuClick}
      />
    </ConfigProvider>
  );
};

export default TopbarMenu;

'use client';

import { useState, useEffect } from 'react';
import { useUIStore } from '@/store';
import { Header } from './Header';
import { SideNav } from './SideNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mobileSidebarOpen = useUIStore((state) => state.mobileSidebarOpen);
  const setMobileSidebar = useUIStore((state) => state.setMobileSidebar);

  // Prevent hydration errors
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sync local state with store
  useEffect(() => {
    setSidebarOpen(mobileSidebarOpen);
  }, [mobileSidebarOpen]);

  const toggleSidebar = () => {
    setMobileSidebar(!sidebarOpen);
  };

  const closeSidebar = () => {
    setMobileSidebar(false);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className='flex flex-col h-screen'>
      <Header onMenuClick={toggleSidebar} />

      <div className='flex flex-1 overflow-hidden'>
        {/* Desktop sidebar */}
        <div className='hidden md:block h-full'>
          <SideNav />
        </div>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className='fixed inset-0 z-40 md:hidden'>
            <div
              className='fixed inset-0 bg-black/20 backdrop-blur-sm'
              onClick={closeSidebar}
            />
            <div className='fixed inset-y-0 left-0 z-40 w-full max-w-xs'>
              <SideNav isMobile onItemClick={closeSidebar} />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className='flex-1 overflow-auto'>{children}</main>
      </div>
    </div>
  );
}

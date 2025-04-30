import { useState, useEffect } from 'react';
import { useUIStore } from '@/store';

export function useSidebar() {
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

  return {
    isMounted,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
  };
}

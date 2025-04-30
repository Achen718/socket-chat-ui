import { MainLayout } from '@/components/layout/MainLayout';
import { SideNavProvider } from '@/context/SideNavContext';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SideNavProvider>
      <MainLayout>{children}</MainLayout>
    </SideNavProvider>
  );
}

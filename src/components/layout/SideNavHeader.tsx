// src/components/chat/SideNavHeader.tsx
import { Button } from '@/components/ui/button';
import { Plus, Bot } from 'lucide-react'; // Assuming you're using lucide icons

interface SideNavHeaderProps {
  onNewChat: () => void;
  onNewAiChat: () => void;
  isCreatingAIChat: boolean;
}

export function SideNavHeader({
  onNewChat,
  onNewAiChat,
  isCreatingAIChat,
}: SideNavHeaderProps) {
  return (
    <div className='p-4'>
      <Button
        variant='default'
        className='w-full justify-start gap-2'
        onClick={onNewChat}
      >
        <Plus className='h-4 w-4' />
        New Chat
      </Button>

      <Button
        variant='outline'
        className='w-full justify-start gap-2 mt-2'
        onClick={onNewAiChat}
        disabled={isCreatingAIChat}
      >
        <Bot className='h-4 w-4' />
        {isCreatingAIChat ? 'Creating AI Chat...' : 'New AI Chat'}
      </Button>
    </div>
  );
}

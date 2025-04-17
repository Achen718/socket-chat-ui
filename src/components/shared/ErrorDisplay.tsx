import { XCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Different error severity levels
export type ErrorSeverity = 'error' | 'warning' | 'info';

interface ErrorDisplayProps {
  message: string;
  severity?: ErrorSeverity;
  className?: string;
  onDismiss?: () => void;
}

/**
 * A reusable error display component for consistent error presentation
 */
export function ErrorDisplay({
  message,
  severity = 'error',
  className,
  onDismiss,
}: ErrorDisplayProps) {
  // Map severity to appropriate styles and icon
  const severityConfig = {
    error: {
      variant: 'destructive' as const,
      icon: <XCircle />,
    },
    warning: {
      variant: 'default' as const,
      icon: <AlertTriangle className='text-amber-600 dark:text-amber-400' />,
    },
    info: {
      variant: 'default' as const,
      icon: <Info className='text-blue-600 dark:text-blue-400' />,
    },
  };

  const { variant, icon } = severityConfig[severity];

  return (
    <Alert variant={variant} className={cn('mb-4', className)}>
      {icon}
      <AlertDescription>{message}</AlertDescription>
      {onDismiss && (
        <Button
          variant='ghost'
          size='icon'
          className='absolute right-1 top-1 h-6 w-6'
          onClick={onDismiss}
        >
          <span className='sr-only'>Dismiss</span>
          <XCircle className='h-4 w-4' />
        </Button>
      )}
    </Alert>
  );
}

/**
 * A simplified usage of ErrorDisplay specifically for form errors
 */
export function FormErrorMessage({ error }: { error?: string }) {
  if (!error) return null;

  return <ErrorDisplay message={error} className='py-2 px-3 mb-2 text-xs' />;
}

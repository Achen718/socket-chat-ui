'use client';

import Link from 'next/link';
import { LoginForm } from '@/components/auth/login/LoginForm';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-muted/40'>
      <div className='max-w-md w-full'>
        <Card className='shadow-lg'>
          <CardContent className='pt-6'>
            <LoginForm />
          </CardContent>
          <CardFooter className='flex justify-center border-t p-4'>
            <div className='text-xs text-muted-foreground'>
              By continuing, you agree to our{' '}
              <Link
                href='/terms'
                className='underline underline-offset-4 hover:text-primary'
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href='/privacy'
                className='underline underline-offset-4 hover:text-primary'
              >
                Privacy Policy
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

type Size = 'small' | 'medium' | 'large';

interface LoadingSpinnerProps {
  size?: Size;
  className?: string;
}

export function LoadingSpinner({
  size = 'medium',
  className = '',
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className={`${className} flex items-center justify-center`}>
      <div
        className={`${spinnerSize} border-4 border-gray-300 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500 rounded-full animate-spin`}
        role='status'
        aria-label='Loading'
      />
    </div>
  );
}

import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { mockAuthValues, mockRouterValues } from './mocks';
import { useRouter } from 'next/navigation';
import * as hooks from '@/hooks';

// Types for our custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValues?: Partial<typeof mockAuthValues>;
  routerValues?: Partial<typeof mockRouterValues>;
}

// A wrapper component that includes all providers needed for components
interface AllProvidersProps {
  children: React.ReactNode;
  authValues?: Partial<typeof mockAuthValues>;
  routerValues?: Partial<typeof mockRouterValues>;
}

// The provider wrapper component
const AllProviders = ({
  children,
  authValues = {},
  routerValues = {},
}: AllProvidersProps) => {
  // Setup mocks before rendering
  jest.mocked(hooks.useAuth).mockReturnValue({
    ...mockAuthValues,
    ...authValues,
  });

  jest.mocked(useRouter).mockReturnValue({
    ...mockRouterValues,
    ...routerValues,
  });

  return <ThemeProvider>{children}</ThemeProvider>;
};

// Custom render function with all providers
function customRender(
  ui: ReactElement,
  {
    authValues = {},
    routerValues = {},
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  return render(ui, {
    wrapper: (props) => (
      <AllProviders
        {...props}
        authValues={authValues}
        routerValues={routerValues}
      />
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override the render method
export { customRender as render };

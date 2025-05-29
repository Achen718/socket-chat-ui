import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { mockAuthValues, mockRouterValues } from './mocks';
import { useRouter } from 'next/navigation';
import * as hooks from '@/hooks';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authValues?: Partial<typeof mockAuthValues>;
  routerValues?: Partial<typeof mockRouterValues>;
}

interface AllProvidersProps {
  children: React.ReactNode;
  authValues?: Partial<typeof mockAuthValues>;
  routerValues?: Partial<typeof mockRouterValues>;
}

const AllProviders = ({
  children,
  authValues = {},
  routerValues = {},
}: AllProvidersProps) => {
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

export * from '@testing-library/react';

export { customRender as render };

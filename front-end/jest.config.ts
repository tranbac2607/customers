import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    'redux-persist/lib/storage': '<rootDir>/__mocks__/storage.ts',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2020',
          module: 'commonjs',
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          resolveJsonModule: true,
          isolatedModules: true,
          moduleResolution: 'node',
          baseUrl: 'src',
          paths: { '@/*': ['*'] },
        },
      },
    ],
  },
  // Strip Next.js "use client" / "use server" directives from source files
  // before they reach the transformer. They are no-ops in Jest.
  transformIgnorePatterns: ['/node_modules/(?!(nanoid|next)/)'],
  testTimeout: 10000,
};

export default config;

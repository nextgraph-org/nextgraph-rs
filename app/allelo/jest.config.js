export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        moduleResolution: 'nodenext',
        baseUrl: '.',
        noUnusedLocals: false,
        noUnusedParameters: false,
        paths: {
          '@/*': ['src/*'],
          '@/assets/*': ['src/assets/*'],
          '@/components/*': ['src/components/*'],
          '@/contexts/*': ['src/contexts/*'],
          '@/hooks/*': ['src/hooks/*'],
          '@/lib/*': ['src/lib/*'],
          '@/pages/*': ['src/pages/*'],
          '@/providers/*': ['src/providers/*'],
          '@/services/*': ['src/services/*'],
          '@/stores/*': ['src/stores/*'],
          '@/types/*': ['src/types/*'],
          '@/utils/*': ['src/utils/*']
        }
      }
    }],
  },
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@/providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(spec|test).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
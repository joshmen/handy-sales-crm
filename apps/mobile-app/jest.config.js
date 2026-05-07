/**
 * Jest config para tests unitarios de lógica pura (sin RN runtime).
 *
 * Usamos `ts-jest` directo en lugar de `jest-expo` porque:
 * - Las funciones críticas a testear son puras (calculateLineAmounts,
 *   captureOrderLocation cascade logic, sync mappers, JWT refresh queue).
 * - `jest-expo` requiere mockear todo el bridge nativo de RN — overkill
 *   para tests que no renderean componentes.
 * - Tests más rápidos (sin transformar 1000+ archivos de node_modules
 *   de RN) y debug más simple.
 *
 * Para tests de componentes RN (renderear `<JornadaCard />`, etc.),
 * cuando se necesiten, instalar `jest-expo` + `@testing-library/react-native`
 * y usar este config como base con `preset: 'jest-expo'` añadido.
 *
 * BUG-4 audit (2026-05-06): cobertura mínima inicial. Iterar añadiendo
 * tests para mappers.ts (sync engine), captureOrderLocation cascade,
 * y JWT refresh queue.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/android/', '/ios/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Tests pueden usar JSX si testean componentes; por ahora no.
        jsx: 'react',
        // Permitimos imports `@/utils/...` via paths
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      },
    }],
  },
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/services/captureOrderLocation.ts',
    'src/sync/mappers.ts',
    '!**/*.d.ts',
  ],
};

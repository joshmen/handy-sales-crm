// Jest global type declarations
declare const describe: jest.Describe;
declare const it: jest.It;
declare const test: jest.It;
declare const expect: jest.Expect;
declare const beforeEach: jest.Lifecycle;
declare const afterEach: jest.Lifecycle;
declare const beforeAll: jest.Lifecycle;
declare const afterAll: jest.Lifecycle;

declare namespace jest {
  interface Describe {
    (name: string, fn: () => void): void;
    only(name: string, fn: () => void): void;
    skip(name: string, fn: () => void): void;
  }

  interface It {
    (name: string, fn: () => void | Promise<void>, timeout?: number): void;
    only(name: string, fn: () => void | Promise<void>, timeout?: number): void;
    skip(name: string, fn: () => void | Promise<void>): void;
  }

  interface Lifecycle {
    (fn: () => void | Promise<void>, timeout?: number): void;
  }

  interface Expect {
    <T>(actual: T): Matchers<T>;
    assertions(num: number): void;
    extend(matchers: Record<string, unknown>): void;
    objectContaining<T>(obj: T): T;
    arrayContaining<T>(arr: T[]): T[];
    stringContaining(str: string): string;
    stringMatching(str: string | RegExp): string;
    any(constructor: unknown): unknown;
  }

  interface Matchers<T> {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toStrictEqual(expected: unknown): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeCloseTo(expected: number, precision?: number): void;
    toBeInstanceOf(expected: unknown): void;
    toContain(expected: unknown): void;
    toContainEqual(expected: unknown): void;
    toHaveLength(expected: number): void;
    toHaveProperty(path: string, value?: unknown): void;
    toMatch(expected: string | RegExp): void;
    toMatchObject(expected: object): void;
    toThrow(expected?: string | Error | RegExp): void;
    toThrowError(expected?: string | Error | RegExp): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledTimes(expected: number): void;
    toHaveBeenCalledWith(...args: unknown[]): void;
    toHaveBeenLastCalledWith(...args: unknown[]): void;
    toHaveBeenNthCalledWith(n: number, ...args: unknown[]): void;
    toHaveReturned(): void;
    toHaveReturnedTimes(expected: number): void;
    toHaveReturnedWith(expected: unknown): void;
    toHaveLastReturnedWith(expected: unknown): void;
    toHaveNthReturnedWith(n: number, expected: unknown): void;
    resolves: Matchers<T>;
    rejects: Matchers<T>;
    not: Matchers<T>;
  }

  interface Mock<T = unknown, Y extends unknown[] = unknown[]> {
    (...args: Y): T;
    mockClear(): this;
    mockReset(): this;
    mockRestore(): void;
    mockImplementation(fn: (...args: Y) => T): this;
    mockImplementationOnce(fn: (...args: Y) => T): this;
    mockReturnValue(value: T): this;
    mockReturnValueOnce(value: T): this;
    mockResolvedValue(value: Awaited<T>): this;
    mockResolvedValueOnce(value: Awaited<T>): this;
    mockRejectedValue(value: unknown): this;
    mockRejectedValueOnce(value: unknown): this;
    mock: MockContext<T, Y>;
  }

  interface MockContext<T, Y extends unknown[]> {
    calls: Y[];
    results: Array<{ type: 'return' | 'throw'; value: T }>;
    instances: T[];
    lastCall: Y;
  }

  function fn<T = unknown, Y extends unknown[] = unknown[]>(
    implementation?: (...args: Y) => T
  ): Mock<T, Y>;

  function mock(moduleName: string, factory?: () => unknown): typeof jest;

  function clearAllMocks(): typeof jest;
  function resetAllMocks(): typeof jest;
  function restoreAllMocks(): typeof jest;
}

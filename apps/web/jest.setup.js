require('@testing-library/jest-dom');

// Mock next-auth
jest.mock('next-auth/react', () => ({
  getSession: jest.fn(() => Promise.resolve({ accessToken: 'test-token' })),
  useSession: jest.fn(() => ({ data: { accessToken: 'test-token' }, status: 'authenticated' })),
}));

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    pathname: '/',
  },
  writable: true,
});

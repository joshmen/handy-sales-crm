/// <reference path="../jest.d.ts" />

// Mock must be defined inline to avoid hoisting issues
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

import { api } from '@/lib/api';
import { usersService, User, CreateUserRequest, UpdateUserRequest, PaginatedResult } from '@/services/api/users';

const mockApi = api as {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
};

// Mock data
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  tenantId: 1,
  telefono: '555-1234',
  verificado: true,
  fechaVerificacion: '2025-01-15T10:00:00Z',
};

const mockPaginatedResult: PaginatedResult<User> = {
  items: [mockUser],
  totalCount: 1,
  page: 1,
  pageSize: 10,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

describe('UsersService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should fetch all users without params', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [mockUser] });

      const result = await usersService.getAllUsers();

      expect(mockApi.get).toHaveBeenCalledWith('/api/usuarios');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([mockUser]);
    });

    it('should fetch users with pagination params', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockPaginatedResult });

      const result = await usersService.getAllUsers({
        page: 2,
        pageSize: 20,
      });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('pageSize=20'));
      expect(result.success).toBe(true);
    });

    it('should fetch users with search param', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [mockUser] });

      await usersService.getAllUsers({ search: 'test' });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('search=test'));
    });

    it('should fetch users with isActive filter', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      await usersService.getAllUsers({ isActive: true });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('isActive=true'));
    });

    it('should fetch users with role filter', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      await usersService.getAllUsers({ role: 'ADMIN' });

      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('role=ADMIN'));
    });

    it('should fetch users with multiple params', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockPaginatedResult });

      await usersService.getAllUsers({
        page: 1,
        pageSize: 10,
        search: 'john',
        isActive: true,
        role: 'VENDEDOR',
      });

      const calledUrl = mockApi.get.mock.calls[0][0];
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).toContain('pageSize=10');
      expect(calledUrl).toContain('search=john');
      expect(calledUrl).toContain('isActive=true');
      expect(calledUrl).toContain('role=VENDEDOR');
    });

    it('should handle API errors gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await usersService.getAllUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.data).toBeNull();
    });

    it('should handle unknown errors', async () => {
      mockApi.get.mockRejectedValueOnce('Unknown error');

      const result = await usersService.getAllUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Error desconocido');
    });
  });

  describe('getUserById', () => {
    it('should fetch a user by ID', async () => {
      mockApi.get.mockResolvedValueOnce({ data: mockUser });

      const result = await usersService.getUserById(1);

      expect(mockApi.get).toHaveBeenCalledWith('/api/usuarios/1');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle not found error', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('User not found'));

      const result = await usersService.getUserById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const createData: CreateUserRequest = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        nombre: 'New User',
        esAdmin: false,
        tenantId: 1,
      };

      const createdUser = { ...mockUser, id: 2, email: createData.email };
      mockApi.post.mockResolvedValueOnce({ data: createdUser });

      const result = await usersService.createUser(createData);

      expect(mockApi.post).toHaveBeenCalledWith('/api/usuarios', createData);
      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(createData.email);
    });

    it('should handle validation errors', async () => {
      const invalidData: CreateUserRequest = {
        email: 'invalid-email',
        password: '123', // Too short
        nombre: '',
        esAdmin: false,
        tenantId: 1,
      };

      mockApi.post.mockRejectedValueOnce(new Error('Validation failed'));

      const result = await usersService.createUser(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    it('should handle duplicate email error', async () => {
      const duplicateData: CreateUserRequest = {
        email: 'existing@example.com',
        password: 'ValidPass123!',
        nombre: 'Test User',
        esAdmin: false,
        tenantId: 1,
      };

      mockApi.post.mockRejectedValueOnce(new Error('Email already exists'));

      const result = await usersService.createUser(duplicateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });
  });

  describe('updateUser', () => {
    it('should update an existing user', async () => {
      const updateData: UpdateUserRequest = {
        nombre: 'Updated Name',
        esAdmin: true,
        activo: true,
        telefono: '555-9999',
        verificado: true,
      };

      const updatedUser = { ...mockUser, ...updateData };
      mockApi.put.mockResolvedValueOnce({ data: updatedUser });

      const result = await usersService.updateUser(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/api/usuarios/1', updateData);
      expect(result.success).toBe(true);
      expect(result.data?.telefono).toBe('555-9999');
    });

    it('should update user with partial data', async () => {
      const updateData: UpdateUserRequest = {
        nombre: 'Only Name Update',
        esAdmin: false,
        activo: true,
      };

      mockApi.put.mockResolvedValueOnce({ data: { ...mockUser, ...updateData } });

      const result = await usersService.updateUser(1, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.telefono).toBe(mockUser.telefono); // Original value preserved
    });

    it('should handle not found error on update', async () => {
      const updateData: UpdateUserRequest = {
        nombre: 'Test',
        esAdmin: false,
        activo: true,
      };

      mockApi.put.mockRejectedValueOnce(new Error('User not found'));

      const result = await usersService.updateUser(999, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: undefined });

      const result = await usersService.deleteUser(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/api/usuarios/1');
      expect(result.success).toBe(true);
    });

    it('should handle not found error on delete', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error('User not found'));

      const result = await usersService.deleteUser(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle constraint error on delete', async () => {
      mockApi.delete.mockRejectedValueOnce(new Error('Cannot delete user with active orders'));

      const result = await usersService.deleteUser(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete user with active orders');
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await usersService.getAllUsers();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout errors', async () => {
      mockApi.get.mockRejectedValueOnce(new Error('Request timeout'));

      const result = await usersService.getAllUsers();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request timeout');
    });

    it('should handle server errors', async () => {
      mockApi.post.mockRejectedValueOnce(new Error('Internal server error'));

      const result = await usersService.createUser({
        email: 'test@example.com',
        password: 'Test123!',
        nombre: 'Test',
        esAdmin: false,
        tenantId: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Internal server error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty response', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      const result = await usersService.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle null response data', async () => {
      mockApi.get.mockResolvedValueOnce({ data: null });

      const result = await usersService.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should not include undefined params in query string', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      await usersService.getAllUsers({
        page: 1,
        search: undefined,
        isActive: undefined,
      });

      const calledUrl = mockApi.get.mock.calls[0][0];
      expect(calledUrl).toContain('page=1');
      expect(calledUrl).not.toContain('search=');
      expect(calledUrl).not.toContain('isActive=');
    });
  });
});

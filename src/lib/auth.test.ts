import { encrypt, decrypt } from './auth';

// Mock jose library to avoid ESM issues in Jest
jest.mock('jose', () => {
  return {
    SignJWT: jest.fn().mockImplementation(() => ({
      setProtectedHeader: jest.fn().mockReturnThis(),
      setIssuedAt: jest.fn().mockReturnThis(),
      setExpirationTime: jest.fn().mockReturnThis(),
      sign: jest.fn().mockResolvedValue('mock.token.string'),
    })),
    jwtVerify: jest.fn().mockImplementation((token) => {
        if (token === 'mock.token.string') {
            return Promise.resolve({
                payload: { userId: '123', role: 'receptionist', exp: 1234567890, iat: 1234567890 }
            });
        }
        return Promise.reject(new Error('Invalid token'));
    }),
  };
});

const ORIGINAL_ENV = process.env;

beforeAll(() => {
  process.env = { ...ORIGINAL_ENV, JWT_SECRET_KEY: 'super-secret-key-for-testing' };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('auth', () => {
  const mockPayload = { userId: '123', role: 'receptionist' as const };

  describe('encrypt', () => {
    it('should return a signed JWT string', async () => {
      const token = await encrypt(mockPayload);
      expect(token).toBe('mock.token.string');
    });
  });

  describe('decrypt', () => {
    it('should decrypt a valid token and return the payload', async () => {
      const payload = await decrypt('mock.token.string');

      expect(payload).toEqual(expect.objectContaining(mockPayload));
    });

    it('should return null for an invalid token', async () => {
      const payload = await decrypt('invalid-token');
      expect(payload).toBeNull();
    });
  });
});

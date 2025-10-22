import { GreenCheckClient } from './index';

// Mock fetch globally
global.fetch = jest.fn();

describe('GreenCheckClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should instantiate with valid config', () => {
    const client = new GreenCheckClient({
      authToken: 'test-token'
    });
    
    expect(client).toBeInstanceOf(GreenCheckClient);
  });

  test('should make phone verification request', async () => {
    const mockResponse = { success: true };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    const client = new GreenCheckClient({
      authToken: 'test-token'
    });

    const result = await client.requestPhoneVerification('+12345678901');
    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/gc-mobile/start-phone-claim'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Authorization': 'test-token',
          'Content-Type': 'application/json'
        })
      })
    );
  });
});
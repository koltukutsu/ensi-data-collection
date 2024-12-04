import { app, analytics } from '../config';

describe('Firebase Config', () => {
  it('should initialize Firebase app', () => {
    expect(app).toBeDefined();
  });

  it('should initialize analytics only in browser environment', () => {
    // Mock window object
    const windowSpy = jest.spyOn(global, 'window', 'get');

    // Test browser environment
    windowSpy.mockImplementation(() => ({}) as Window & typeof globalThis);
    expect(analytics).toBeDefined();

    // Test server environment
    windowSpy.mockImplementation(() => undefined as any);
    expect(analytics).toBeNull();

    windowSpy.mockRestore();
  });
});

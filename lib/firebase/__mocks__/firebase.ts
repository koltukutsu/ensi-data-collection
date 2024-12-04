export const mockFirebase = {
  app: jest.fn(),
  firestore: jest.fn(),
  storage: jest.fn()
};

jest.mock('firebase/app', () => mockFirebase);
jest.mock('firebase/firestore', () => mockFirebase);
jest.mock('firebase/storage', () => mockFirebase);

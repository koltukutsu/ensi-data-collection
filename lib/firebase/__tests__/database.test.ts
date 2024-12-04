import { database } from '../database';

// Mock data
const mockUser = {
  name: 'John Doe',
  email: 'john@example.com'
};

describe('Firebase Database', () => {
  const collectionName = 'users';
  let createdDocId: string;

  it('should create a new document', async () => {
    const result = await database.create(collectionName, mockUser);
    expect(result).toHaveProperty('id');
    expect(result.name).toBe(mockUser.name);
    createdDocId = result.id!;
  });

  it('should get a document by ID', async () => {
    const result = await database.get(collectionName, createdDocId);
    expect(result).toMatchObject(mockUser);
  });

  it('should update a document', async () => {
    const updateData = { name: 'Jane Doe' };
    await database.update(collectionName, createdDocId, updateData);

    const updated = await database.get(collectionName, createdDocId);
    expect(updated).toMatchObject({ ...mockUser, ...updateData });
  });

  it('should query documents', async () => {
    const results = await database.query(
      collectionName,
      'email',
      '==',
      mockUser.email
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject(mockUser);
  });

  it('should delete a document', async () => {
    await database.delete(collectionName, createdDocId);
    const result = await database.get(collectionName, createdDocId);
    expect(result).toBeNull();
  });
});

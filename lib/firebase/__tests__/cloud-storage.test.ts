import { cloudStorage } from '../cloud-storage';

describe('Cloud Storage', () => {
  const testFile = new File(['test content'], 'test.txt', {
    type: 'text/plain'
  });
  let uploadedFilePath: string;

  it('should generate unique file paths', () => {
    const path1 = cloudStorage.generatePath('test', 'file.txt');
    const path2 = cloudStorage.generatePath('test', 'file.txt');

    expect(path1).toMatch(/test\/\d+-[a-z0-9]+-file\.txt/);
    expect(path1).not.toBe(path2);
  });

  it('should upload a file', async () => {
    const path = cloudStorage.generatePath('test', testFile.name);
    const result = await cloudStorage.upload(path, testFile);

    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('path');
    expect(result.url).toMatch(/^https:\/\//);

    uploadedFilePath = result.path;
  });

  it('should get download URL', async () => {
    const url = await cloudStorage.getUrl(uploadedFilePath);
    expect(url).toMatch(/^https:\/\//);
  });

  it('should delete a file', async () => {
    await expect(cloudStorage.delete(uploadedFilePath)).resolves.not.toThrow();
  });
});

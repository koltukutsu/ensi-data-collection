import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { app } from './config';

// Initialize Storage
const storage = getStorage(app);

export const cloudStorage = {
  // Upload a file
  upload: async (
    path: string,
    file: File
  ): Promise<{ url: string; path: string }> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { url, path };
  },

  // Delete a file
  delete: async (path: string): Promise<void> => {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  },

  // Get download URL
  getUrl: async (path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    return await getDownloadURL(storageRef);
  },

  // Generate a unique file path
  generatePath: (folder: string, fileName: string): string => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    return `${folder}/${timestamp}-${randomString}-${fileName}`;
  }
};

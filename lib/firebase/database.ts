import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  Query,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { app } from './config';

// Initialize Firestore
const db = getFirestore(app);

export const database = {
  // Create a new document
  create: async <T extends object>(
    collectionName: string,
    data: T & { id?: string }
  ): Promise<T & { id: string }> => {
    const docRef = doc(collection(db, collectionName));
    const docData = { ...data, id: docRef.id };
    await setDoc(docRef, docData);
    return docData;
  },

  // Get a document by ID
  get: async <T>(collectionName: string, docId: string): Promise<T | null> => {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? (docSnap.data() as T) : null;
  },

  // Update a document
  update: async <T>(
    collectionName: string,
    docId: string,
    data: Partial<T>
  ): Promise<void> => {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data as any);
  },

  // Delete a document
  delete: async (collectionName: string, docId: string): Promise<void> => {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  },

  // Query documents
  query: async <T>(
    collectionName: string,
    field: keyof T,
    operator: '==' | '>' | '<' | '>=' | '<=',
    value: any
  ): Promise<T[]> => {
    const q = query(
      collection(db, collectionName),
      where(field as string, operator, value)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ ...doc.data(), id: doc.id }) as T
    );
  },

  // Get all documents from a collection
  getAll: async <T>(collectionName: string): Promise<T[]> => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(
      (doc) => ({ ...doc.data(), id: doc.id }) as T
    );
  },

  // Subscribe to real-time updates
  subscribe: <T>(
    collectionName: string,
    callback: (data: T[]) => void,
    ...queryConstraints: QueryConstraint[]
  ) => {
    const collectionRef = collection(db, collectionName);
    const q = query(collectionRef, ...queryConstraints);

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(
        (doc) => ({ ...doc.data(), id: doc.id }) as T
      );
      callback(data);
    });
  }
};

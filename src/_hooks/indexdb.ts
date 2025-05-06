'use client';

import { useState, useEffect } from 'react';

interface IndexDBHookResult<T> {
  value: T | null;
  setValue: (newValue: T) => Promise<void>;
  clearValue: () => Promise<void>;
  error: Error | null;
  isLoading: boolean;
}

function useIndexDB<T>(
  dbName: string,
  storeName: string,
  key: string,
  initialValue: T | null = null
): IndexDBHookResult<T> {
  const [value, setValue] = useState<T | null>(initialValue);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize DB on mount
  useEffect(() => {
    setIsLoading(true);
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => {
      setError(new Error('Failed to open IndexedDB'));
      setIsLoading(false);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = async () => {
      const db = request.result;
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => {
          if (getRequest.result !== undefined) {
            setValue(getRequest.result);
          }
          setIsLoading(false);
        };
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to read from IndexedDB'));
        setIsLoading(false);
      }
    };
  }, [dbName, storeName, key]);

  const setIndexDBValue = async (newValue: T): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => {
        const error = new Error('Failed to open IndexedDB');
        setError(error);
        setIsLoading(false);
        reject(error);
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        const putRequest = store.put(newValue, key);

        putRequest.onsuccess = () => {
          setValue(newValue);
          setIsLoading(false);
          resolve();
        };

        putRequest.onerror = () => {
          const error = new Error('Failed to write to IndexedDB');
          setError(error);
          setIsLoading(false);
          reject(error);
        };
      };
    });
  };

  const clearIndexDBValue = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      setIsLoading(true);
      const request = indexedDB.open(dbName, 1);

      request.onerror = () => {
        const error = new Error('Failed to open IndexedDB');
        setError(error);
        setIsLoading(false);
        reject(error);
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);

        const deleteRequest = store.delete(key);

        deleteRequest.onsuccess = () => {
          setValue(null);
          setIsLoading(false);
          resolve();
        };

        deleteRequest.onerror = () => {
          const error = new Error('Failed to clear value from IndexedDB');
          setError(error);
          setIsLoading(false);
          reject(error);
        };
      };
    });
  };

  return {
    value,
    setValue: setIndexDBValue,
    clearValue: clearIndexDBValue,
    error,
    isLoading
  };
}

export default useIndexDB;

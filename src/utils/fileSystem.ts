/*
 * Lightweight filesystem helpers that wrap Bun APIs so higher-level services stay expressive.
*/

import { mkdir, stat } from 'node:fs/promises';

export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      await mkdir(dirPath, { recursive: true });
      return;
    }
    throw error;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    return (await Bun.file(filePath).json()) as T;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    return null;
  }
}

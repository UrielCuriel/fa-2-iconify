/*
 * Handles structural validation for the FontAwesome kit before we hit the database layer.
*/

import { readdir, stat } from 'node:fs/promises';
import { join } from 'path';

import { FONTAWESOME_KIT_STRUCTURE } from '@/config/constants';
import type { ValidationResult } from '@/types';

export async function validateKit(): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
  };

  const requiredDirs = Object.values(FONTAWESOME_KIT_STRUCTURE) as string[];

  for (const dir of requiredDirs) {
    try {
      const stats = await stat(dir);
      if (!stats.isDirectory()) {
        result.errors.push(`${dir} is not a directory`);
        result.isValid = false;
      }
    } catch {
      result.errors.push(`Missing required directory: ${dir}`);
      result.isValid = false;
    }
  }

  if (!result.isValid) return result;

  const metadataDir = FONTAWESOME_KIT_STRUCTURE.metadata;
  const metadataFiles = (await readdir(metadataDir)).filter((file) => file.endsWith('.json'));

  if (metadataFiles.length === 0) {
    result.errors.push('No metadata JSON files found in metadata directory');
    result.isValid = false;
  }

  const svgsDir = FONTAWESOME_KIT_STRUCTURE.svgs;
  const svgEntries = await readdir(svgsDir, { withFileTypes: true });
  const svgSubdirs = svgEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (svgSubdirs.length === 0) {
    result.warnings.push('No SVG subdirectories found - kit may be incomplete');
  }

  return result;
}

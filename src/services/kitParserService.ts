/*
 * Parses the FontAwesome kit metadata and SVG files, persisting the result into SQLite.
 */

import { basename, join } from 'path';
import { readdir } from 'node:fs/promises';
import type { Database } from 'bun:sqlite';

import { FONTAWESOME_KIT_STRUCTURE } from '@/config/constants';
import type { FontAwesomeMetadata, FontAwesomeIcon, IconData } from '@/types';
import { insertIcon } from '@/services/databaseService';
import { parseSvgFile } from '@/utils/svg';
import { readJsonFile } from '@/utils/fileSystem';

export async function parseKit(db: Database): Promise<FontAwesomeMetadata> {
  const metadata: FontAwesomeMetadata = {};

  const metadataDir = FONTAWESOME_KIT_STRUCTURE.metadata;
  const metadataFiles = (await readdir(metadataDir)).filter((file) => file.endsWith('.json'));

  for (const file of metadataFiles) {
    const filePath = join(metadataDir, file);
    const data = await readJsonFile<Record<string, FontAwesomeIcon>>(filePath);
    if (data) {
      Object.assign(metadata, data);
    }
  }

  const svgsDir = FONTAWESOME_KIT_STRUCTURE.svgs;
  const svgEntries = await readdir(svgsDir, { withFileTypes: true });
  const svgSubdirs = svgEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  for (const subdir of svgSubdirs) {
    const styleDir = join(svgsDir, subdir);
    const svgFiles = (await readdir(styleDir)).filter((file) => file.endsWith('.svg'));

    for (const svgFile of svgFiles) {
      const filePath = join(styleDir, svgFile);
      const iconName = basename(svgFile, '.svg');
      const svgData = await parseSvgFile(filePath);

      if (svgData && metadata[iconName]) {
        const iconData: IconData = {
          name: iconName,
          style: subdir,
          body: svgData.body,
          width: svgData.width,
          height: svgData.height,
          viewBox: svgData.viewBox,
          unicode: metadata[iconName].unicode,
          searchTerms: metadata[iconName].search?.terms || [],
        };

        insertIcon(db, iconData);
      }
    }
  }

  return metadata;
}

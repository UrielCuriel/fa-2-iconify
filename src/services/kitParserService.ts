/*
 * Parses the FontAwesome kit metadata and SVG files, persisting the result into SQLite.
 */

import { basename, join } from 'path';
import { readdir } from 'node:fs/promises';
import type { Database } from 'bun:sqlite';

import { FONTAWESOME_KIT_STRUCTURE } from '@/config/constants';
import type { FontAwesomeMetadata, FontAwesomeIcon, IconData, SvgData } from '@/types';
import { insertIcon } from '@/services/databaseService';
import { buildSvgBody, formatViewBox, parseSvgFile } from '@/utils/svg';
import { readJsonFile } from '@/utils/fileSystem';

const DEFAULT_ICON_SIZE = 512;

export async function parseKit(db: Database, kitRoot = '.'): Promise<FontAwesomeMetadata> {
  const metadata: FontAwesomeMetadata = {};

  const metadataDir = join(kitRoot, FONTAWESOME_KIT_STRUCTURE.metadata);
  const iconsMetadataPath = join(metadataDir, 'icons.json');
  const iconsMetadata = await readJsonFile<Record<string, FontAwesomeIcon>>(iconsMetadataPath);
  if (iconsMetadata) {
    Object.assign(metadata, iconsMetadata);
  }

  const svgsDir = join(kitRoot, FONTAWESOME_KIT_STRUCTURE.svgs);
  const svgEntries = await readdir(svgsDir, { withFileTypes: true });
  const svgSubdirs = svgEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  for (const style of svgSubdirs) {
    const styleDir = join(svgsDir, style);
    const svgFiles = (await readdir(styleDir)).filter((file) => file.endsWith('.svg'));

    for (const svgFile of svgFiles) {
      const iconName = basename(svgFile, '.svg');
      const icon = metadata[iconName];
      if (!icon) {
        continue;
      }

      const svgData = icon.svg?.[style];

      let body: string | null = null;
      let width: number | undefined;
      let height: number | undefined;
      let viewBox: string | undefined;

      const filePath = join(styleDir, svgFile);
      const parsedSvg = await parseSvgFile(filePath);
      if (parsedSvg) {
        body = parsedSvg.body;
        width = parsedSvg.width;
        height = parsedSvg.height;
        viewBox = parsedSvg.viewBox;
      }

      if (!body && svgData) {
        body = buildSvgBody(svgData);
      }

      const { width: derivedWidth, height: derivedHeight } = deriveDimensions(svgData);
      width = width ?? derivedWidth;
      height = height ?? derivedHeight;

      if (!viewBox) {
        if (svgData) {
          viewBox = formatViewBox(svgData, width, height);
        } else {
          viewBox = `0 0 ${width} ${height}`;
        }
      }

      if (!body) {
        continue;
      }

      const resolvedWidth = width ?? DEFAULT_ICON_SIZE;
      const resolvedHeight = height ?? DEFAULT_ICON_SIZE;
      const resolvedViewBox = viewBox ?? `0 0 ${resolvedWidth} ${resolvedHeight}`;

      const iconData: IconData = {
        name: iconName,
        style,
        body,
        width: resolvedWidth,
        height: resolvedHeight,
        viewBox: resolvedViewBox,
        unicode: icon.unicode,
        searchTerms: icon.search?.terms || [],
      };

      insertIcon(db, iconData);
    }
  }

  return metadata;
}

function deriveDimensions(svgData?: SvgData): { width: number; height: number } {
  if (!svgData) {
    return { width: DEFAULT_ICON_SIZE, height: DEFAULT_ICON_SIZE };
  }

  const [viewBoxWidth, viewBoxHeight] = Array.isArray(svgData.viewBox) && svgData.viewBox.length === 4
    ? [svgData.viewBox[2], svgData.viewBox[3]]
    : [undefined, undefined];

  const width = svgData.width ?? viewBoxWidth ?? DEFAULT_ICON_SIZE;
  const height = svgData.height ?? viewBoxHeight ?? DEFAULT_ICON_SIZE;

  return { width, height };
}

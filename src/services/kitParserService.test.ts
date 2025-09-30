import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'path';

import { initDatabase, getAvailableStyles, getIconsByStyle } from '@/services/databaseService';
import { parseKit } from '@/services/kitParserService';

const tempDirs: string[] = [];

interface TempKitOptions {
  metadataIcons: Record<string, unknown>;
  svgByStyle: Record<string, Record<string, string>>;
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createTempKit(options: TempKitOptions): Promise<string> {
  const kitRoot = await mkdtemp(join(tmpdir(), 'fa-kit-'));
  tempDirs.push(kitRoot);

  const metadataDir = join(kitRoot, 'metadata');
  const svgsDir = join(kitRoot, 'svgs');
  const fontsDir = join(kitRoot, 'otfs');

  await mkdir(metadataDir, { recursive: true });
  await mkdir(svgsDir, { recursive: true });
  await mkdir(fontsDir, { recursive: true });
  await writeFile(join(metadataDir, 'icons.json'), JSON.stringify(options.metadataIcons, null, 2));
  for (const [style, icons] of Object.entries(options.svgByStyle)) {
    await mkdir(join(svgsDir, style), { recursive: true });
    const styleDir = join(svgsDir, style);
    await mkdir(styleDir, { recursive: true });
    for (const [iconName, svgContent] of Object.entries(icons)) {
      await writeFile(join(styleDir, `${iconName}.svg`), svgContent);
    }
  }
  return kitRoot;
}

test('parseKit extracts SVG body and dimensions from filesystem SVGs', async () => {
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64"><rect width="48" height="64" fill="currentColor"/></svg>';

  const kitRoot = await createTempKit({
    metadataIcons: {
      sample: {
        changes: [],
        free: ['solid'],
        label: 'Sample',
        ligatures: [],
        search: { terms: ['sample'] },
        styles: ['solid'],
        svg: {},
        unicode: 'f101',
        voted: false,
      },
    },
    svgByStyle: {
      solid: {
        sample: svgContent,
      },
    },
  });

  const db = initDatabase();
  await parseKit(db, kitRoot);

  const styles = getAvailableStyles(db);
  expect(styles).toContain('solid');

  const icons = getIconsByStyle(db, 'solid');
  expect(icons.length).toBe(1);
  const icon = icons[0];
  if (!icon) {
    throw new Error('Icon was not parsed');
  }
  expect(icon.body).toContain('<rect');
  expect(icon.width).toBe(48);
  expect(icon.height).toBe(64);
  expect(icon.viewBox).toBe('0 0 48 64');
});

test('parseKit falls back to viewBox dimensions when width and height attributes are missing', async () => {
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 60"><circle cx="15" cy="30" r="10" fill="currentColor"/></svg>';

  const kitRoot = await createTempKit({
    metadataIcons: {
      fallback: {
        changes: [],
        free: ['regular'],
        label: 'Fallback',
        ligatures: [],
        search: { terms: ['fallback'] },
        styles: ['regular'],
        svg: {},
        unicode: 'f102',
        voted: false,
      },
    },
    svgByStyle: {
      regular: {
        fallback: svgContent,
      },
    },
  });

  const db = initDatabase();
  await parseKit(db, kitRoot);

  const icons = getIconsByStyle(db, 'regular');
  expect(icons.length).toBe(1);
  const icon = icons[0];
  if (!icon) {
    throw new Error('Icon was not parsed');
  }
  expect(icon.width).toBe(30);
  expect(icon.height).toBe(60);
  expect(icon.viewBox).toBe('0 0 30 60');
});

const REAL_KIT_ROOT = join(process.cwd(), 'font-awesome-kit');
const REAL_KIT_AVAILABLE = existsSync(REAL_KIT_ROOT);

if (REAL_KIT_AVAILABLE) {
  test('parseKit discovers multiple styles from the real FontAwesome kit', async () => {
    const db = initDatabase();
    await parseKit(db, REAL_KIT_ROOT);

    const styles = getAvailableStyles(db);
    expect(styles.length).toBeGreaterThan(0);
    expect(styles).toContain('solid');
  });
}

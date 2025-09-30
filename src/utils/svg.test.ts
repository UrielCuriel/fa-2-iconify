import { test, expect } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'path';

import { parseSvgFile } from './svg';

test('parseSvgFile derives width and height from viewBox when attributes are missing', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'fa-2-iconify-'));
  const tempFile = join(tempDir, 'icon.svg');

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M0 0h320v512H0z"/></svg>';
  await Bun.write(tempFile, svg);

  const result = await parseSvgFile(tempFile);

  expect(result).not.toBeNull();
  expect(result?.width).toBe(320);
  expect(result?.height).toBe(512);

  await rm(tempDir, { recursive: true, force: true });
});

test('parseSvgFile prioritizes explicit width and height attributes when present', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'fa-2-iconify-'));
  const tempFile = join(tempDir, 'icon.svg');

  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="128px" height="256" viewBox="0 0 320 512"><path d="M0 0h320v512H0z"/></svg>';
  await Bun.write(tempFile, svg);

  const result = await parseSvgFile(tempFile);

  expect(result).not.toBeNull();
  expect(result?.width).toBe(128);
  expect(result?.height).toBe(256);

  await rm(tempDir, { recursive: true, force: true });
});

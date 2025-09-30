/*
 * SVG parsing helpers that normalize FontAwesome SVG files into Iconify-friendly payloads.
 */

import type { SvgData } from '@/types';

export async function parseSvgFile(filePath: string): Promise<{
  body: string;
  width: number;
  height: number;
  viewBox: string;
} | null> {
  try {
    const content = await Bun.file(filePath).text();
    const viewBoxMatch = content.match(/viewBox="([^"]+)"/);
    const widthMatch = content.match(/width="([^"]+)"/);
    const heightMatch = content.match(/height="([^"]+)"/);

    if (!viewBoxMatch?.[1]) return null;

    const bodyMatch = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    const body = bodyMatch?.[1]?.trim();

    if (!body) return null;

    return {
      body,
      width: widthMatch?.[1] ? parseInt(widthMatch[1], 10) : 24,
      height: heightMatch?.[1] ? parseInt(heightMatch[1], 10) : 24,
      viewBox: viewBoxMatch[1],
    };
  } catch (error) {
    console.error(`Error parsing SVG file ${filePath}:`, error);
    return null;
  }
}

export function extractBodyFromRawSvg(raw?: string): string | null {
  if (!raw) return null;
  const bodyMatch = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
  if (bodyMatch?.[1]) {
    const trimmed = bodyMatch[1].trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

export function buildSvgBody(svgData: SvgData): string | null {
  const rawBody = extractBodyFromRawSvg(svgData.raw);
  if (rawBody) {
    return rawBody;
  }

  if (!svgData.path) return null;

  const pathList = Array.isArray(svgData.path) ? svgData.path : [svgData.path];
  const elements = pathList
    .filter((segment): segment is string => typeof segment === 'string' && segment.trim().length > 0)
    .map((segment: string) => `<path d="${segment}" fill="currentColor" />`);

  if (elements.length === 0) {
    return null;
  }

  return elements.join('\n');
}

export function formatViewBox(svgData: SvgData, fallbackWidth: number, fallbackHeight: number): string {
  if (Array.isArray(svgData.viewBox) && svgData.viewBox.length === 4) {
    return svgData.viewBox.join(' ');
  }
  return `0 0 ${fallbackWidth} ${fallbackHeight}`;
}

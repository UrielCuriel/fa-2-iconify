/*
 * SVG parsing helpers that normalize FontAwesome SVG files into Iconify-friendly payloads.
 */

const DEFAULT_SVG_DIMENSION = 512;

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

    const parseNumericAttribute = (value?: string | null): number | undefined => {
      if (!value) return undefined;
      const numeric = Number.parseFloat(value);
      return Number.isFinite(numeric) ? numeric : undefined;
    };

    const parseViewBoxDimensions = (value: string): { width?: number; height?: number } => {
      const parts = value
        .trim()
        .split(/[\s,]+/)
        .map((part) => Number.parseFloat(part));

      if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
        return {};
      }

      return { width: parts[2], height: parts[3] };
    };
    const viewBox = viewBoxMatch[1].trim();
    const viewBoxDimensions = parseViewBoxDimensions(viewBox);

    const width = parseNumericAttribute(widthMatch?.[1]) ?? viewBoxDimensions.width ?? DEFAULT_SVG_DIMENSION;
    const height = parseNumericAttribute(heightMatch?.[1]) ?? viewBoxDimensions.height ?? DEFAULT_SVG_DIMENSION;

    return {
      body,
      width,
      height,
      viewBox,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts the body (inner SVG markup) from a raw SVG string.
 */
export function extractBodyFromRawSvg(raw?: string | null): string | null {
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
/**
 * Builds a viewBox string from SvgData or fallback dimensions.
 */
export function buildViewBox(
  svgData: SvgData,
  fallbackWidth?: number,
  fallbackHeight?: number
): string {
  if (Array.isArray(svgData.viewBox) && svgData.viewBox.length === 4) {
    return svgData.viewBox.join(' ');
  }
  return `0 0 ${fallbackWidth ?? DEFAULT_SVG_DIMENSION} ${fallbackHeight ?? DEFAULT_SVG_DIMENSION}`;
}


export function formatViewBox(svgData: SvgData, width?: number, height?: number): string {
    if (Array.isArray(svgData.viewBox) && svgData.viewBox.length === 4) {
        return svgData.viewBox.join(' ');
    }
    return `0 0 ${width ?? DEFAULT_SVG_DIMENSION} ${height ?? DEFAULT_SVG_DIMENSION}`;
}
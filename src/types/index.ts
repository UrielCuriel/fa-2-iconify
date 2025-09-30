/*
 * Shared TypeScript types that model the converter domain.
 * Exporting them from a central module keeps contracts consistent across services.
 */

import type { IconifyIcon } from '@iconify/utils';

export interface FontAwesomeIconAliases {
  names?: string[];
  unicodes?: {
    secondary?: string[];
  };
}

export type SvgPathData = string | string[];

export interface SvgData {
  height?: number;
  path?: SvgPathData;
  raw?: string;
  viewBox?: [number, number, number, number];
  width?: number;
}

export interface FontAwesomeIcon {
  aliases?: FontAwesomeIconAliases;
  changes: string[];
  free: string[];
  label: string;
  ligatures: string[];
  search?: {
    terms?: string[];
  };
  styles: string[];
  svg: Record<string, SvgData>;
  unicode: string;
  voted?: boolean;
}

export interface FontAwesomeMetadata {
  [iconName: string]: FontAwesomeIcon;
}

export interface KitConfig {
  name: string;
  version: string;
  description: string;
  iconSetName: string;
  prefix: string;
  outputDir: string;
  selectedStyles: string[];
}

export interface IconData {
  name: string;
  style: string;
  body: string;
  width: number;
  height: number;
  viewBox: string;
  unicode: string;
  searchTerms: string[];
}

export interface StyleIconSet {
  prefix: string;
  icons: Record<string, IconifyIcon>;
  width: number;
  height: number;
  info: {
    name: string;
    total: number;
    version: string;
    author: {
      name: string;
    };
    license: {
      title: string;
      spdx: string;
    };
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface IconSet {
  prefix: string;
  icons: Record<string, IconifyIcon>;
  aliases?: Record<string, string>;
  width: number;
  height: number;
  info: {
    name: string;
    total: number;
    version: string;
    author: {
      name: string;
    };
    license: {
      title: string;
      spdx: string;
    };
  };
}

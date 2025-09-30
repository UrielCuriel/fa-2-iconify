#!/usr/bin/env bun

/**
 * FontAwesome to Iconify Converter Script
 *
 * This script converts FontAwesome Pro Desktop kits into Iconify-compatible NPM packages
 * while ensuring legal compliance and licensing restrictions.
 *
 * Usage: Place this script in the FontAwesome kit directory and run:
 * bun run index.ts
 *
 * @version 1.0.0
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { intro, outro, text, confirm, spinner, cancel, multiselect } from '@clack/prompts';
import type { IconifyIcon } from '@iconify/utils';
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { Database } from 'bun:sqlite';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const LICENSING_DISCLAIMER = `
⚠️  FONTAWESOME TO ICONIFY CONVERTER - LICENSING NOTICE

This tool is designed for personal use only. FontAwesome Pro icons are subject to
strict licensing terms that prohibit redistribution, commercial use without proper
licensing, and any form of public sharing.

IMPORTANT LEGAL RESTRICTIONS:
- Generated packages MUST be marked as private
- Do not publish to NPM or any public registry
- Do not distribute the generated package
- Use only for personal/internal projects
- Maintain compliance with FontAwesome's terms of service

By proceeding, you acknowledge these restrictions and agree to use this tool
responsibly and in accordance with FontAwesome's licensing terms.
`;

const REQUIRED_DEPENDENCIES = [
    '@iconify/utils',
    '@clack/prompts',
    'typescript',
];

const FONTAWESOME_KIT_STRUCTURE = {
    metadata: 'metadata',
    svgs: 'svgs',
    fonts: 'otfs'
};

const OUTPUT_PACKAGE_STRUCTURE = {
    src: 'src',
    dist: 'dist',
    types: 'types'
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface FontAwesomeIconAliases {
    names?: string[];
    unicodes?: {
        secondary?: string[];
    };
}

type SvgPathData = string | string[];

interface SvgData {
    height?: number;
    path?: SvgPathData;
    raw?: string;
    viewBox?: [number, number, number, number];
    width?: number;
}

interface FontAwesomeIcon {
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

interface FontAwesomeMetadata {
    [iconName: string]: FontAwesomeIcon;
}

interface KitConfig {
    name: string;
    version: string;
    description: string;
    iconSetName: string;
    prefix: string;
    outputDir: string;
    selectedStyles: string[];
}

interface IconData {
    name: string;
    style: string;
    body: string;
    width: number;
    height: number;
    viewBox: string;
    unicode: string;
    searchTerms: string[];
}

interface StyleIconSet {
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

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

interface IconSet {
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validates NPM package name format
 */
function isValidPackageName(name: string): boolean {
    const npmNameRegex = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
    return npmNameRegex.test(name) && name.length <= 214;
}

/**
 * Validates semantic version format
 */
function isValidSemver(version: string): boolean {
    const semverRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semverRegex.test(version);
}

/**
 * Ensures directory exists, creates if necessary
 */
function ensureDirectory(dirPath: string): void {
    if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Reads and parses JSON file safely
 */
async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        return await Bun.file(filePath).json() as T;
    } catch (error) {
        console.error(`Error reading JSON file ${filePath}:`, error);
        return null;
    }
}

/**
 * Extracts SVG content and metadata
 */
async function parseSvgFile(filePath: string): Promise<{ body: string; width: number; height: number; viewBox: string } | null> {
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
            viewBox: viewBoxMatch[1]
        };
    } catch (error) {
        console.error(`Error parsing SVG file ${filePath}:`, error);
        return null;
    }
}

// ============================================================================
// SQLITE DATABASE SETUP
// ============================================================================

/**
 * Initializes SQLite database for icon storage
 */
function initDatabase(): Database {
    const db = new Database(':memory:');

    // Create tables
    db.run(`
        CREATE TABLE icons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            style TEXT NOT NULL,
            body TEXT NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            viewBox TEXT NOT NULL,
            unicode TEXT,
            searchTerms TEXT,
            UNIQUE(name, style)
        );

        CREATE INDEX idx_icons_name ON icons(name);
        CREATE INDEX idx_icons_style ON icons(style);
        CREATE INDEX idx_icons_name_style ON icons(name, style);
    `);

    return db;
}

/**
 * Inserts icon data into database
 */
function insertIcon(db: Database, iconData: IconData): void {
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO icons (name, style, body, width, height, viewBox, unicode, searchTerms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        iconData.name,
        iconData.style,
        iconData.body,
        iconData.width,
        iconData.height,
        iconData.viewBox,
        iconData.unicode,
        JSON.stringify(iconData.searchTerms)
    );
}

function extractBodyFromRawSvg(raw?: string): string | null {
    if (!raw) return null;
    const bodyMatch = raw.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    if (bodyMatch?.[1]) {
        const trimmed = bodyMatch[1].trim();
        return trimmed.length > 0 ? trimmed : null;
    }
    return null;
}

function buildSvgBody(svgData: SvgData): string | null {
    const rawBody = extractBodyFromRawSvg(svgData.raw);
    if (rawBody) {
        return rawBody;
    }

    if (!svgData.path) return null;

    const pathList = Array.isArray(svgData.path) ? svgData.path : [svgData.path];
    const elements = pathList
        .filter((segment): segment is string => typeof segment === 'string' && segment.trim().length > 0)
        .map(segment => `<path d="${segment}" fill="currentColor" />`);

    if (elements.length === 0) {
        return null;
    }

    return elements.join('\n');
}

function formatViewBox(svgData: SvgData, fallbackWidth: number, fallbackHeight: number): string {
    if (Array.isArray(svgData.viewBox) && svgData.viewBox.length === 4) {
        return svgData.viewBox.join(' ');
    }
    return `0 0 ${fallbackWidth} ${fallbackHeight}`;
}

/**
 * Gets all available styles from database
 */
function getAvailableStyles(db: Database): string[] {
    const result = db.query('SELECT DISTINCT style FROM icons ORDER BY style').all() as { style: string }[];
    return result.map(row => row.style);
}

/**
 * Gets icons by style
 */
function getIconsByStyle(db: Database, style: string): IconData[] {
    const query = db.query('SELECT name, body, width, height FROM icons WHERE style = ?');
    return query.all(style) as IconData[];
}

/**
 * Searches icons by name or search terms
 */
function searchIcons(db: Database, query: string, styles?: string[]): IconData[] {
    let sql = `
        SELECT * FROM icons
        WHERE (name LIKE ? OR searchTerms LIKE ?)
    `;
    const params: any[] = [`%${query}%`, `%${query}%`];

    if (styles && styles.length > 0) {
        const placeholders = styles.map(() => '?').join(',');
        sql += ` AND style IN (${placeholders})`;
        params.push(...styles);
    }

    sql += ' ORDER BY name, style';

    const result = db.query(sql).all(...params) as any[];
    return result.map(row => ({
        name: row.name,
        style: row.style,
        body: row.body,
        width: row.width,
        height: row.height,
        viewBox: row.viewBox,
        unicode: row.unicode,
        searchTerms: JSON.parse(row.searchTerms || '[]')
    }));
}

/**
 * Installs required dependencies using Bun
 */
async function installDependencies(): Promise<void> {
    const s = spinner();
    s.start('Installing required dependencies...');

    try {
        for (const dep of REQUIRED_DEPENDENCIES) {
            const proc = Bun.spawn(['bun', 'add', dep], { stdout: 'inherit', stderr: 'inherit' });
            await proc.exited;
        }
        s.stop('Dependencies installed successfully');
    } catch (error) {
        s.stop('Failed to install dependencies');
        throw new Error(`Dependency installation failed: ${error}`);
    }
}

// ============================================================================
// KIT VALIDATION
// ============================================================================

/**
 * Validates FontAwesome kit structure and integrity
 */
function validateKit(): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    // Check required directories
    for (const dir of Object.values(FONTAWESOME_KIT_STRUCTURE)) {
        if (!existsSync(dir)) {
            result.errors.push(`Missing required directory: ${dir}`);
            result.isValid = false;
        } else if (!statSync(dir).isDirectory()) {
            result.errors.push(`${dir} is not a directory`);
            result.isValid = false;
        }
    }

    if (!result.isValid) return result;

    // Check for metadata files
    const metadataDir = FONTAWESOME_KIT_STRUCTURE.metadata;
    const metadataFiles = readdirSync(metadataDir).filter(file => file.endsWith('.json'));

    if (metadataFiles.length === 0) {
        result.errors.push('No metadata JSON files found in metadata directory');
        result.isValid = false;
    }

    // Check for SVG directories
    const svgsDir = FONTAWESOME_KIT_STRUCTURE.svgs;
    const svgSubdirs = readdirSync(svgsDir).filter(item =>
        statSync(join(svgsDir, item)).isDirectory()
    );

    if (svgSubdirs.length === 0) {
        result.warnings.push('No SVG subdirectories found - kit may be incomplete');
    }

    return result;
}

// ============================================================================
// KIT PARSING
// ============================================================================

/**
 * Parses FontAwesome kit metadata and SVG files for all styles
 */
async function parseKit(db: Database): Promise<FontAwesomeMetadata> {
    const metadata: FontAwesomeMetadata = {};

    // Read metadata files
    const metadataDir = FONTAWESOME_KIT_STRUCTURE.metadata;
    const metadataFiles = readdirSync(metadataDir).filter(file => file.endsWith('.json'));

    for (const file of metadataFiles) {
        const filePath = join(metadataDir, file);
        const data = await readJsonFile<Record<string, FontAwesomeIcon>>(filePath);
        if (data) {
            Object.assign(metadata, data);
        }
    }

    // Process SVG files from all style directories
    const svgsDir = FONTAWESOME_KIT_STRUCTURE.svgs;
    const svgSubdirs = readdirSync(svgsDir).filter(item =>
        statSync(join(svgsDir, item)).isDirectory()
    );

    for (const subdir of svgSubdirs) {
        const styleDir = join(svgsDir, subdir);
        const svgFiles = readdirSync(styleDir).filter(file => file.endsWith('.svg'));

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
                    searchTerms: metadata[iconName].search?.terms || []
                };

                insertIcon(db, iconData);
            }
        }
    }

    return metadata;
}

// ============================================================================
// ICONIFY CONVERSION
// ============================================================================

/**
 * Converts FontAwesome data to Iconify icon set format
 */
function convertToIconify(metadata: FontAwesomeMetadata, icons: Map<string, IconifyIcon>, config: KitConfig): IconSet {
    const iconSet: IconSet = {
        prefix: config.prefix,
        icons: {},
        aliases: {},
        width: 24,
        height: 24,
        info: {
            name: config.iconSetName,
            total: icons.size,
            version: config.version,
            author: {
                name: 'FontAwesome to Iconify Converter'
            },
            license: {
                title: 'FontAwesome Pro License',
                spdx: 'UNLICENSED'
            }
        }
    };

    for (const [name, icon] of icons) {
        iconSet.icons[name] = icon;

        // Add aliases if present in metadata
        if (metadata[name]?.search?.terms) {
            // Simplified - in real implementation, handle aliases properly
        }
    }

    return iconSet;
}

// ============================================================================
// PACKAGE GENERATION
// ============================================================================

/**
 * Generates the complete NPM package structure
 */
async function generatePackage(db: Database, config: KitConfig): Promise<number> {
    const s = spinner();
    s.start('Generating package structure...');

    try {
        // Create directories
        ensureDirectory(config.outputDir);
        ensureDirectory(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.src));
        ensureDirectory(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.dist));
        ensureDirectory(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.types));

        let totalIcons = 0;
        const styleSets: Record<string, StyleIconSet> = {};

        // Generate icon sets for each selected style
        for (const style of config.selectedStyles) {
            const icons = getIconsByStyle(db, style);
            if (icons.length === 0) continue;

            const iconifyIcons: Record<string, IconifyIcon> = {};
            for (const icon of icons) {
                iconifyIcons[icon.name] = {
                    body: icon.body,
                    width: icon.width,
                    height: icon.height,
                    left: 0,
                    top: 0,
                    rotate: 0,
                    vFlip: false,
                    hFlip: false
                };
            }

            const styleName = style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, '');
            const prefix = `${config.prefix}-${style}`;

            styleSets[style] = {
                prefix,
                icons: iconifyIcons,
                width: 24,
                height: 24,
                info: {
                    name: `${config.iconSetName} ${styleName}`,
                    total: icons.length,
                    version: config.version,
                    author: {
                        name: 'FontAwesome to Iconify Converter'
                    },
                    license: {
                        title: 'FontAwesome Pro License',
                        spdx: 'UNLICENSED'
                    }
                }
            };

            totalIcons += icons.length;
        }

        // Generate package.json with multiple exports
        const exports: Record<string, any> = {
            '.': {
                types: './types/index.d.ts',
                import: './dist/index.js'
            }
        };

        const devDependencies: Record<string, string> = {
            'bun': 'latest',
            'typescript': '^5.0.0'
        };

        // Add exports for each style
        for (const style of config.selectedStyles) {
            const styleName = style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, '');
            const exportName = `fa${styleName}Set`;
            exports[`./${exportName}`] = {
                types: `./types/${exportName}.d.ts`,
                import: `./src/${exportName}.js`
            };
        }

        const packageJson = {
            name: config.name,
            version: config.version,
            description: config.description,
            main: './dist/index.js',
            module: './dist/index.js',
            types: './types/index.d.ts',
            exports,
            private: true,
            keywords: ['iconify', 'icons', 'fontawesome', 'svg'],
            author: 'Generated by FontAwesome to Iconify Converter',
            license: 'UNLICENSED',
            scripts: {
                build: 'bun build ./src/index.ts --outdir ./dist',
                dev: 'bun run ./src/index.ts'
            },
            devDependencies,
            peerDependencies: {
                '@iconify/react': '^4.0.0'
            }
        };

        await Bun.write(join(config.outputDir, 'package.json'), JSON.stringify(packageJson, null, 2));

        // Generate main index.ts
        const mainExports = config.selectedStyles.map(style => {
            const styleName = style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, '');
            return `export { fa${styleName}Set } from './fa${styleName}Set.js';`;
        }).join('\n');

        const indexTs = `
// Auto-generated by FontAwesome to Iconify Converter
${mainExports}

// Re-export types
export type { IconifyIcon } from '@iconify/utils';
`;

        await Bun.write(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.src, 'index.ts'), indexTs);

        // Generate individual style files
        for (const [style, iconSet] of Object.entries(styleSets)) {
            const styleName = style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, '');
            const exportName = `fa${styleName}Set`;

            // Generate style-specific icon set file
            const styleFile = `
// Auto-generated by FontAwesome to Iconify Converter
import iconSet from './${style}.json' with { type: 'json' };

export const ${exportName} = iconSet;
export default iconSet;
`;

            await Bun.write(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.src, `${exportName}.ts`), styleFile);

            // Generate style-specific JSON file
            await Bun.write(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.src, `${style}.json`), JSON.stringify(iconSet, null, 2));
        }

        // Generate TypeScript declarations
        let typesContent = `
// Auto-generated type definitions
import type { IconifyIcon } from '@iconify/utils';

export interface FontAwesomeProIconSet {
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
`;

        for (const style of config.selectedStyles) {
            const styleName = style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, '');
            const exportName = `fa${styleName}Set`;
            typesContent += `
export declare const ${exportName}: FontAwesomeProIconSet;
`;
        }

        typesContent += `
export default FontAwesomeProIconSet;
`;

        await Bun.write(join(config.outputDir, OUTPUT_PACKAGE_STRUCTURE.types, 'index.d.ts'), typesContent);

        // Generate README.md
        const usageExamples = config.selectedStyles.map(style => {
            const styleName = style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, '');
            const exportName = `fa${styleName}Set`;
            return `### ${styleName} Style
\`\`\`typescript
import { ${exportName} } from '${config.name}';
import { Icon } from '@iconify/react';

// Use ${styleName} icons
<Icon icon="${config.prefix}-${style}:icon-name" />
\`\`\``;
        }).join('\n\n');

        const readme = `# ${config.name}

${config.description}

## ⚠️ Important Licensing Notice

This package contains FontAwesome Pro icons and is generated for **personal use only**.
- **DO NOT** publish this package to NPM or any public registry
- **DO NOT** distribute this package
- **DO NOT** use commercially without proper FontAwesome licensing
- Keep this package private and internal to your projects

## Installation

\`\`\`bash
bun install
\`\`\`

## Usage

${usageExamples}

## Development

\`\`\`bash
# Build the package
bun run build

# Development mode
bun run dev
\`\`\`

## FontAwesome Kit Download Instructions

1. Log in to your FontAwesome Pro account
2. Navigate to the "Kits" section
3. Create a new kit or select an existing one
4. Download the **Desktop** version (not Web)
5. Extract the kit to a directory
6. Place this converter script in the kit directory
7. Run: \`bunx fa-2-iconify\`

## License

UNLICENSED - FontAwesome Pro License applies
`;

        await Bun.write(join(config.outputDir, 'README.md'), readme);

        // Generate .gitignore
        const gitignore = `node_modules/
dist/
*.log
.DS_Store
`;

        await Bun.write(join(config.outputDir, '.gitignore'), gitignore);

        // Generate .npmignore
        const npmignore = `src/
.gitignore
*.ts
!dist/
!types/
`;

        await Bun.write(join(config.outputDir, '.npmignore'), npmignore);

        s.stop('Package structure generated successfully');
        return totalIcons;
    } catch (error) {
        s.stop('Failed to generate package structure');
        throw error;
    }
}

// ============================================================================
// MAIN EXECUTION FLOW
// ============================================================================

/**
 * Main execution function
 */
async function main(): Promise<void> {
    try {
        // Display licensing disclaimer
        intro('FontAwesome to Iconify Converter');
        console.log(LICENSING_DISCLAIMER);

        const proceed = await confirm({
            message: 'Do you acknowledge the licensing restrictions and wish to proceed?',
            initialValue: false
        });

        if (!proceed) {
            cancel('Operation cancelled by user');
            return;
        }

        // Install dependencies
        await installDependencies();

        // Validate kit
        const validation = validateKit();
        if (!validation.isValid) {
            outro(`❌ Kit validation failed:\n${validation.errors.join('\n')}`);
            return;
        }

        if (validation.warnings.length > 0) {
            console.log(`⚠️  Warnings:\n${validation.warnings.join('\n')}`);
        }

        // Collect user inputs
        const config: KitConfig = {
            name: '',
            version: '',
            description: '',
            iconSetName: '',
            prefix: '',
            outputDir: '',
            selectedStyles: []
        };

        config.name = await text({
            message: 'Package name (NPM format):',
            validate: (value: string) => {
                if (!isValidPackageName(value)) {
                    return 'Invalid NPM package name format';
                }
            }
        }) as string;

        config.version = await text({
            message: 'Package version (semantic):',
            initialValue: '1.0.0',
            validate: (value: string) => {
                if (!isValidSemver(value)) {
                    return 'Invalid semantic version format';
                }
            }
        }) as string;

        config.description = await text({
            message: 'Package description:',
            initialValue: 'FontAwesome Pro icons as Iconify icon set'
        }) as string;

        config.iconSetName = await text({
            message: 'Iconify icon set name:',
            initialValue: 'FontAwesome Pro'
        }) as string;

        config.prefix = await text({
            message: 'Icon prefix for Iconify:',
            initialValue: 'fa-pro',
            validate: (value: string) => {
                if (!/^[a-z0-9-]+$/.test(value)) {
                    return 'Prefix must contain only lowercase letters, numbers, and hyphens';
                }
            }
        }) as string;

        config.outputDir = await text({
            message: 'Output directory path:',
            initialValue: './fa-iconify-package',
            validate: (value: string) => {
                if (existsSync(value) && !statSync(value).isDirectory()) {
                    return 'Path exists but is not a directory';
                }
            }
        }) as string;

        // Initialize database
        const db = initDatabase();

        // Parse kit data
        const s = spinner();
        s.start('Parsing FontAwesome kit...');
        await parseKit(db);
        const availableStyles = getAvailableStyles(db);
        s.stop(`Parsed kit with ${availableStyles.length} styles available`);

        // Style selection
        if (availableStyles.length === 0) {
            outro('❌ No icons found in the kit');
            return;
        }

        config.selectedStyles = await multiselect({
            message: 'Select FontAwesome styles to include:',
            options: availableStyles.map(style => ({
                value: style,
                label: style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' ')
            })),
            required: true
        }) as string[];

        if (config.selectedStyles.length === 0) {
            cancel('No styles selected');
            return;
        }

        // Generate package
        const totalIcons = await generatePackage(db, config);

        // Success output
        outro(`✅ Package generated successfully!

📦 Package Location: ${config.outputDir}
📦 Package Name: ${config.name}
📦 Version: ${config.version}
📦 Styles: ${config.selectedStyles.join(', ')}
📦 Total Icons: ${totalIcons}

🚀 Next Steps:
1. cd ${config.outputDir}
2. bun install
3. bun run build
4. Import and use in your projects

⚠️  Remember: Keep this package private and do not distribute!

📚 For usage examples, see the generated README.md`);

    } catch (error) {
        outro(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        process.exit(1);
    }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

if (import.meta.main) {
    main();
}
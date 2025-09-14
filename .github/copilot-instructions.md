# Copilot Instructions for fa-2-iconify

## Project Overview
This project converts FontAwesome Pro Desktop kits into Iconify-compatible NPM packages, with strict licensing compliance. It is built with Bun and TypeScript, and is intended for **private/internal use only**.

## Architecture & Key Files
- `index.ts`: Main entry point. Handles kit validation, parsing, conversion, and package generation. All workflows start here.
- `font-awesome-kit/`: Place the FontAwesome Pro kit here. Contains:
  - `metadata/`: Icon metadata in JSON/YAML
  - `svgs/`: SVG files organized by style
  - `otfs/`: Font files (not processed)
- Output is generated in a user-specified directory (default: `./fa-iconify-package`).

## Developer Workflow
- **Install dependencies:**
  ```bash
  bun install
  ```
- **Run the converter:**
  ```bash
  bun run index.ts
  ```
- **Follow interactive prompts** to configure package details and output location.
- **Generated package** includes:
  - `package.json` (marked `private: true`)
  - `src/icons.json` (Iconify icon set)
  - `src/index.ts`, `types/index.d.ts`, `README.md`, `.gitignore`, `.npmignore`

## Conventions & Patterns
- **Licensing:** All generated packages must remain private. Do not publish or distribute.
- **Validation:** Kit structure is validated before processing. Errors halt execution.
- **SVG Parsing:** Only basic `<path>` extraction is performed; complex SVGs may require manual review.
- **TypeScript:** Strict mode enabled. See `tsconfig.json` for custom settings (e.g., `moduleResolution: bundler`).
- **Dependency Management:** Uses Bun for all installs and scripts.
- **Prompts:** Uses `@clack/prompts` for interactive CLI UX.

## Integration Points
- **FontAwesome Pro Desktop Kit:** User must manually download and extract kit into `font-awesome-kit/`.
- **Iconify:** Output is compatible with Iconify React and other Iconify tools.

## Example Usage
```typescript
import { iconSet } from 'your-package-name';
import { Icon } from '@iconify/react';
<Icon icon={`fa-pro:icon-name`} />
```

## Troubleshooting
- If kit validation fails, check for missing `metadata/` or `svgs/` directories.
- For SVG parsing issues, inspect problematic files in `font-awesome-kit/svgs/`.
- All errors and warnings are surfaced in the CLI output.

## References
- Main logic: `index.ts`
- Kit structure: `font-awesome-kit/`
- Output package: user-defined directory
- Bun documentation: https://bun.sh
- Iconify documentation: https://docs.iconify.design

---
**Edit this file to clarify project-specific rules for future AI agents.**

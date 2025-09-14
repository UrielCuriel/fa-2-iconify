# FontAwesome to Iconify Converter

A powerful tool that converts **FontAwesome Pro Desktop kits** into **Iconify-compatible NPM packages** with multi-style support, SQLite database integration, and optimized performance using Bun.

## ✨ Features

- 🚀 **Multi-Style Support**: Convert all FontAwesome styles (brands, solid, regular, light, duotone, etc.)
- 🗄️ **SQLite Database**: Fast icon storage and querying for large icon sets
- 🎯 **Interactive Style Selection**: Choose which styles to include in your package
- 📦 **Separate Files per Style**: Generate individual icon sets (`faSolidSet`, `faBrandsSet`, etc.)
- ⚡ **Optimized Performance**: Uses Bun's fast I/O APIs and in-memory SQLite database
- 🔒 **Licensing Compliant**: Generates private packages with proper FontAwesome licensing
- 📝 **TypeScript Support**: Full type definitions for all generated packages
- 🎨 **Iconify Compatible**: Works seamlessly with Iconify React and other Iconify tools

## 📋 Prerequisites

- **FontAwesome Pro License** (required for FontAwesome Pro icons)
- **Bun Runtime** (latest version recommended)
- **FontAwesome Pro Desktop Kit** (downloaded from FontAwesome)

## 🚀 Quick Start

### 1. Download FontAwesome Pro Kit

1. Log in to your [FontAwesome Pro account](https://fontawesome.com/)
2. Navigate to **Kits** section
3. Create a new kit or select an existing one
4. Download the **Desktop** version (not Web)
5. Extract the kit to a directory

### 2. Set Up the Converter

```bash
npm install -g fa-2-iconify

```

### 3. Run the Converter

```bash
cd /path/to/your/fontawesome-kit/
bunx fa-2-iconify
```


### 4. Follow Interactive Prompts

The converter will:
- ✅ Validate your FontAwesome kit structure
- 📋 Ask for package configuration (name, version, description)
- 🎯 Let you select which styles to include
- 🗄️ Process icons using SQLite database
- 📦 Generate the Iconify-compatible package

## 📦 Generated Package Structure

```
your-package-name/
├── package.json          # Dynamic exports for each style
├── src/
│   ├── index.ts         # Main exports file
│   ├── faSolidSet.ts    # Solid style exports
│   ├── faBrandsSet.ts   # Brands style exports
│   ├── faRegularSet.ts  # Regular style exports
│   ├── solid.json       # Solid icons data
│   ├── brands.json      # Brands icons data
│   └── regular.json     # Regular icons data
├── types/
│   └── index.d.ts       # TypeScript declarations
├── README.md            # Generated usage documentation
├── .gitignore
└── .npmignore
```

## 🔧 Usage Examples

### Basic Usage

```typescript
// Import specific style sets
import { faSolidSet } from 'your-package-name';
import { faBrandsSet } from 'your-package-name';

// Use with Iconify React
import { Icon } from '@iconify/react';

function MyComponent() {
  return (
    <div>
      <Icon icon="fa-pro-solid:user" size="24" />
      <Icon icon="fa-pro-brands:github" size="24" />
      <Icon icon="fa-pro-regular:heart" size="24" />
    </div>
  );
}
```

### Advanced Usage

```typescript
// Import multiple styles
import { faSolidSet, faBrandsSet, faDuotoneSet } from 'your-package-name';

// Access icon data directly
console.log(faSolidSet.prefix); // "fa-pro-solid"
console.log(faSolidSet.info.total); // Total number of solid icons

// Use with custom styling
<Icon
  icon="fa-pro-solid:star"
  className="text-yellow-500"
  width="32"
  height="32"
/>
```

## ⚙️ Configuration Options

During the conversion process, you'll be prompted to configure:

- **Package Name**: NPM package name (e.g., `@your-org/fa-pro-icons`)
- **Version**: Semantic version (e.g., `1.0.0`)
- **Description**: Package description
- **Icon Set Name**: Name for the icon set (e.g., `FaProIcons`)
- **Prefix**: Icon prefix (e.g., `fa-pro`)
- **Output Directory**: Where to generate the package
- **Styles Selection**: Which FontAwesome styles to include

## 🗄️ Database Features

The converter uses an in-memory SQLite database for:

- **Fast Icon Processing**: Efficiently handle thousands of icons
- **Style-based Filtering**: Quickly filter icons by style
- **Search Optimization**: Fast lookup by icon name or search terms
- **Metadata Storage**: Store icon dimensions, unicode values, and more

## 🔒 Licensing & Legal Compliance

### ⚠️ Important Notice

This tool generates packages for **personal/internal use only**. FontAwesome Pro icons are subject to strict licensing terms.

**Legal Restrictions:**
- ❌ **DO NOT** publish generated packages to NPM or any public registry
- ❌ **DO NOT** distribute the generated package
- ❌ **DO NOT** use commercially without proper FontAwesome Pro licensing
- ✅ Keep packages private and internal to your projects
- ✅ Use only with valid FontAwesome Pro subscriptions

### Generated Package Compliance

All generated packages include:
- `private: true` in package.json
- `UNLICENSED` license field
- Licensing disclaimers in README
- FontAwesome attribution requirements

## 🛠️ Development

### Project Structure

```
fa-2-iconify/
├── index.ts              # Main converter script
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── README.md             # This file
└── font-awesome-kit/     # Example kit structure
    ├── metadata/         # Icon metadata
    ├── svgs/            # SVG icon files
    └── otfs/            # Font files
```

### Building from Source

```bash
# Install dependencies
bun install

# Run in development mode
bun run index.ts

# Build for production (if needed)
bun build index.ts
```

### Dependencies

- **@iconify/utils**: Icon processing and validation
- **@clack/prompts**: Interactive CLI prompts
- **typescript**: TypeScript support

## 📚 API Reference

### Generated Package Exports

```typescript
// Main exports
export { faSolidSet } from 'your-package';
export { faBrandsSet } from 'your-package';
export { faRegularSet } from 'your-package';
// ... etc for each selected style

// Type exports
export type { IconifyIcon } from '@iconify/utils';
```

### Icon Set Structure

```typescript
interface FontAwesomeProIconSet {
  prefix: string;                    // e.g., "fa-pro-solid"
  icons: Record<string, IconifyIcon>; // Icon name -> IconifyIcon mapping
  width: number;                     // Default icon width
  height: number;                    // Default icon height
  info: {
    name: string;                   // Icon set name
    total: number;                  // Total icons in set
    version: string;                // Package version
    author: {
      name: string;                 // "FontAwesome to Iconify Converter"
    };
    license: {
      title: string;                // "FontAwesome Pro License"
      spdx: string;                 // "UNLICENSED"
    };
  };
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with a FontAwesome Pro kit
5. Submit a pull request

## 📄 License

This converter tool is MIT licensed. Generated FontAwesome packages are subject to FontAwesome Pro licensing terms.

## 🙏 Acknowledgments

- [FontAwesome](https://fontawesome.com/) for their amazing icon library
- [Iconify](https://iconify.design/) for the universal icon framework
- [Bun](https://bun.sh/) for the fast JavaScript runtime

---

**FontAwesome to Iconify Converter** - Convert FontAwesome Pro kits to Iconify packages with ease! 🚀

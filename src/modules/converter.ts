/*
 * High-level application module orchestrating the CLI workflow for the converter.
 * It composes specialized services, keeping business logic readable and testable.
 */

import { intro, outro, text, confirm, cancel, multiselect, spinner } from '@clack/prompts';

import { LICENSING_DISCLAIMER } from '@/config/constants';
import type { KitConfig } from '@/types';
import { installDependencies } from '@/services/dependencyService';
import { initDatabase, getAvailableStyles } from '@/services/databaseService';
import { validateKit } from '@/services/kitValidationService';
import { parseKit } from '@/services/kitParserService';
import { generatePackage } from '@/services/packageGeneratorService';
import { isValidPackageName, isValidSemver } from '@/utils/packageValidation';
import { ensureDirectory } from '@/utils/fileSystem';

export async function runConverter(): Promise<void> {
  try {
    intro('FontAwesome to Iconify Converter');
    console.log(LICENSING_DISCLAIMER);

    const proceed = await confirm({
      message: 'Do you acknowledge the licensing restrictions and wish to proceed?',
      initialValue: false,
    });

    if (!proceed) {
      cancel('Operation cancelled by user');
      return;
    }

    await installDependencies();

    const validation = await validateKit();
    if (!validation.isValid) {
      outro(`❌ Kit validation failed:\n${validation.errors.join('\n')}`);
      return;
    }

    if (validation.warnings.length > 0) {
      console.log(`⚠️  Warnings:\n${validation.warnings.join('\n')}`);
    }

    const config: KitConfig = {
      name: '',
      version: '',
      description: '',
      iconSetName: '',
      prefix: '',
      outputDir: '',
      selectedStyles: [],
    };

    config.name = (await text({
      message: 'Package name (NPM format):',
      validate: (value: string) => {
        if (!isValidPackageName(value)) {
          return 'Invalid NPM package name format';
        }
      },
    })) as string;

    config.version = (await text({
      message: 'Package version (semantic):',
      initialValue: '1.0.0',
      validate: (value: string) => {
        if (!isValidSemver(value)) {
          return 'Invalid semantic version format';
        }
      },
    })) as string;

    config.description = (await text({
      message: 'Package description:',
      initialValue: 'FontAwesome Pro icons as Iconify icon set',
    })) as string;

    config.iconSetName = (await text({
      message: 'Iconify icon set name:',
      initialValue: 'FontAwesome Pro',
    })) as string;

    config.prefix = (await text({
      message: 'Icon prefix for Iconify:',
      initialValue: 'fa-pro',
      validate: (value: string) => {
        if (!/^[a-z0-9-]+$/.test(value)) {
          return 'Prefix must contain only lowercase letters, numbers, and hyphens';
        }
      },
    })) as string;

    config.outputDir = (await text({
      message: 'Output directory path:',
      initialValue: './fa-iconify-package',
      validate: (value: string) => {
        if (!value || value.trim().length === 0) {
          return 'Output directory is required';
        }
      },
    })) as string;

    try {
      await ensureDirectory(config.outputDir);
    } catch (error) {
      outro(`❌ Output directory issue: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    const db = initDatabase();

    const parseProgress = spinner();
    parseProgress.start('Parsing FontAwesome kit...');
    await parseKit(db);
    const availableStyles = getAvailableStyles(db);
    parseProgress.stop(`Parsed kit with ${availableStyles.length} styles available`);

    if (availableStyles.length === 0) {
      outro('❌ No icons found in the kit');
      return;
    }

    config.selectedStyles = (await multiselect({
      message: 'Select FontAwesome styles to include:',
      options: availableStyles.map((style: string) => ({
        value: style,
        label: style.charAt(0).toUpperCase() + style.slice(1).replace('-', ' '),
      })),
      required: true,
    })) as string[];

    if (config.selectedStyles.length === 0) {
      cancel('No styles selected');
      return;
    }

    const totalIcons = await generatePackage(db, config);

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

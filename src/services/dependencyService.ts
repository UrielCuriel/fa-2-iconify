/*
 * Service in charge of ensuring core runtime dependencies are present via Bun.
 * Isolating it keeps side effects away from the CLI flow, aiding testability.
 */

import { spinner } from '@clack/prompts';

import { REQUIRED_DEPENDENCIES } from '@/config/constants';

export async function installDependencies(): Promise<void> {
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
    throw new Error(`Dependency installation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

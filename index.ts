#!/usr/bin/env bun

/*
 * Entry point that delegates work to the modular CLI workflow.
 * Keeping this file tiny makes it easy to expose the binary while the heavy lifting
 * lives inside well-typed modules under src/.
 */

import { runConverter } from '@/modules/converter';

if (import.meta.main) {
  runConverter();
}
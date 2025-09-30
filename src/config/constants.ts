/*
 * Centralized constants that describe legal messaging and directory contracts.
 * Keeping them here avoids magic strings scattered throughout services.
 */

export const LICENSING_DISCLAIMER = `
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

export const REQUIRED_DEPENDENCIES = [
  '@iconify/utils',
  '@clack/prompts',
  'typescript',
];

export const FONTAWESOME_KIT_STRUCTURE = {
  metadata: 'metadata',
  svgs: 'svgs',
  fonts: 'otfs',
} as const;

export const OUTPUT_PACKAGE_STRUCTURE = {
  src: 'src',
  dist: 'dist',
  types: 'types',
} as const;

/**
 * Loads .dev.vars into process.env (does not override existing vars).
 * Import this at the top of any script that needs env vars from .dev.vars.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const devVarsPath = resolve('.dev.vars');

if (existsSync(devVarsPath)) {
  const lines = readFileSync(devVarsPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

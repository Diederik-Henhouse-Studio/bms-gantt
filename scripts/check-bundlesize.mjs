#!/usr/bin/env node
// Fail CI when the packed tarball exceeds a size budget.
// Prevents accidental inclusion of test fixtures, docs, or large assets.

import { execSync } from 'node:child_process';

const MAX_PACKED_KB = 500; // tarball (gzipped)
const MAX_UNPACKED_KB = 2048; // unpacked dist

const output = execSync('npm pack --dry-run --json 2>/dev/null', { encoding: 'utf8' });
const [info] = JSON.parse(output);

const packedKB = Math.round(info.size / 1024);
const unpackedKB = Math.round(info.unpackedSize / 1024);
const files = info.entryCount;

console.log(`📦 packed: ${packedKB} KB | unpacked: ${unpackedKB} KB | files: ${files}`);

let ok = true;
if (packedKB > MAX_PACKED_KB) {
  console.error(`✗ packed size ${packedKB} KB exceeds budget ${MAX_PACKED_KB} KB`);
  ok = false;
}
if (unpackedKB > MAX_UNPACKED_KB) {
  console.error(`✗ unpacked size ${unpackedKB} KB exceeds budget ${MAX_UNPACKED_KB} KB`);
  ok = false;
}

if (ok) {
  console.log(`✓ within budget (packed ≤${MAX_PACKED_KB} KB, unpacked ≤${MAX_UNPACKED_KB} KB)`);
} else {
  process.exit(1);
}

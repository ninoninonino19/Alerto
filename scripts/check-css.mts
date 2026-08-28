/**
 * Guards the compiled stylesheet against a silent support regression.
 *
 * Run with: npm run check:css — and by `npm run build`, which fails on it.
 *
 * The palette is authored once, as light-dark() pairs. Lightning CSS lowers
 * those to a custom-property toggle for the browsers in `browserslist`, and that
 * lowering is the only reason the theme survives on anything older than Chrome
 * 123 or Safari 17.5.
 *
 * The failure mode this exists for is quiet. Raise the browserslist floor past
 * those versions and the lowering simply stops happening; nothing errors, the
 * build succeeds, and every colour in the interface resolves to `transparent` on
 * the browsers that just fell off the list. Custom properties are not validated
 * until substitution, so there is no earlier point at which anyone finds out.
 *
 * So this asserts the two halves of the contract: no raw light-dark() reaches
 * the browser, and the toggle that replaced it is actually present.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/static";

function stylesheets(dir: string): string[] {
  let found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found = found.concat(stylesheets(path));
    else if (entry.endsWith(".css")) found.push(path);
  }
  return found;
}

let files: string[];
try {
  files = stylesheets(ROOT);
} catch {
  console.error(`check:css  no build found at ${ROOT}. Run npm run build first.`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`check:css  no stylesheet under ${ROOT}. Run npm run build first.`);
  process.exit(1);
}

let failed = false;

for (const file of files) {
  const css = readFileSync(file, "utf8");

  const raw = (css.match(/light-dark\(/g) ?? []).length;
  const toggled = (css.match(/--lightningcss-(light|dark)/g) ?? []).length;

  if (raw > 0) {
    failed = true;
    console.error(
      `fail  ${file}\n` +
        `      ${raw} raw light-dark() calls survived compilation.\n` +
        `      The browserslist floor is now at or above light-dark() support, so Lightning\n` +
        `      CSS stopped lowering it. Every token below that floor will resolve to\n` +
        `      transparent. Lower the floor in package.json, or drop light-dark() from\n` +
        `      app/globals.css and declare the two schemes separately.`,
    );
    continue;
  }

  if (toggled === 0) {
    failed = true;
    console.error(
      `fail  ${file}\n` +
        `      neither light-dark() nor its lowered toggle is present. The palette is not\n` +
        `      being compiled from app/globals.css at all.`,
    );
    continue;
  }

  console.log(`pass  ${file}  light-dark lowered to ${toggled} toggle references`);
}

if (failed) process.exit(1);
console.log("\nStylesheet support contract holds.");

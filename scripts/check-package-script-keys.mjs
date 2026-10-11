import { readFile } from "node:fs/promises";

const raw = await readFile("package.json", "utf8");
const scriptsMatch = raw.match(/"scripts"\s*:\s*\{([\s\S]*?)\n\s*\},\s*\n\s*"dependencies"/);

if (!scriptsMatch) {
  console.error("[package-scripts] unable to locate scripts block");
  process.exit(1);
}

const keys = [...scriptsMatch[1].matchAll(/^\s*"([^"]+)"\s*:/gm)].map(
  (match) => match[1],
);
const duplicates = [...new Set(keys.filter((key, index) => keys.indexOf(key) !== index))];

if (duplicates.length) {
  console.error(
    "[package-scripts] duplicate npm script keys: " + duplicates.join(", "),
  );
  process.exit(1);
}

console.log(
  `[package-scripts] OK — ${keys.length} npm script keys are unique.`,
);

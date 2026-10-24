import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Temporary isolated preview diagnostic; npm officially regenerates transitive lock metadata.
// Only the dependency Cheerio requires (undici 7.x) may change.
const prior = JSON.parse(fs.readFileSync("package-lock.json","utf8"));
execFileSync("npm", ["update","undici","--package-lock-only","--ignore-scripts","--no-audit","--no-fund"], {stdio:"inherit",timeout:120000});
const current = JSON.parse(fs.readFileSync("package-lock.json","utf8"));
const entries = Object.keys({ ...prior.packages, ...current.packages })
  .filter(key => JSON.stringify(prior.packages[key]) !== JSON.stringify(current.packages[key]))
  .map(key => ({key,entry:current.packages[key]??null}));
if (current.packages["node_modules/undici"]?.version !== "7.30.1") throw new Error("Unexpected undici version after npm update");
const output = JSON.stringify({target:"7.30.1",changes:entries});
console.log(`UNDICI_LOCKDIFF_ITEMS=${entries.length};BYTES=${output.length}`);
for(let i=0;i<output.length;i+=900)console.log(`UNDICI_LOCKDIFF_PART_${Math.floor(i/900)}=${output.slice(i,i+900)}`);

import { readFile } from "node:fs/promises";

const files = [
  "app/merchant-pricing/page.tsx",
  "app/merchant-join/page.tsx",
  "app/merchant/register/page.tsx",
  "app/merchant-terms/page.tsx",
  "app/merchant/advertising/page.tsx",
  "components/home/MerchantCTA.tsx",
];

const forbidden = [
  /HK\$\s*180/i,
  /首\s*3\s*個月/,
  /每月最多\s*4\s*個/,
  /單次刊登或月費方案/,
  /免費啟動優惠/,
  /試用期後適合持續舉辦親子活動/,
];

const required = [
  {
    file: "app/merchant-pricing/page.tsx",
    patterns: [/一般活動刊登免費/, /Paid Promotion/, /Sell with Family Fun/],
  },
  {
    file: "app/merchant-terms/page.tsx",
    patterns: [/一般活動資料上載、提交審批及正常活動 Listing 不收取刊登費/, /付費推廣/],
  },
];

let failed = false;

for (const file of files) {
  const content = await readFile(file, "utf8");

  for (const pattern of forbidden) {
    if (pattern.test(content)) {
      console.error(`[commerce-copy] stale pricing copy found in ${file}: ${pattern}`);
      failed = true;
    }
  }
}

for (const check of required) {
  const content = await readFile(check.file, "utf8");

  for (const pattern of check.patterns) {
    if (!pattern.test(content)) {
      console.error(
        `[commerce-copy] required current business rule missing in ${check.file}: ${pattern}`,
      );
      failed = true;
    }
  }
}

if (failed) process.exit(1);

console.log(
  "[commerce-copy] OK — normal event listing remains free; paid promotion stays separate.",
);

"use strict";

const x = 841103;
const y = 815776;
const url =
  "https://www.geodetic.gov.hk/transform/v2/?inSys=hkgrid&outSys=wgsgeog&e=" +
  x +
  "&n=" +
  y;

const response = await fetch(url, {
  headers: {
    "user-agent":
      "HKFamilyFun/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
    accept: "application/json",
  },
  signal: AbortSignal.timeout(15000),
});

console.log("status", response.status);
console.log(await response.text());

if (!response.ok) process.exit(1);

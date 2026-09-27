"use strict";

const query = "香港公園";
const url =
  "https://www.map.gov.hk/gs/api/v1.0.0/locationSearch?q=" +
  encodeURIComponent(query);

const response = await fetch(url, {
  headers: {
    "user-agent":
      "HKFamilyFun/1.0 (+https://hkfamilyfun.com; info@hkfamilyfun.com)",
    accept: "application/json",
  },
  signal: AbortSignal.timeout(15000),
});

console.log("status", response.status);
console.log("content-type", response.headers.get("content-type"));
const text = await response.text();
console.log(text.slice(0, 12000));

if (!response.ok) process.exit(1);

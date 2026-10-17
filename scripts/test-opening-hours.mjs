import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const source = readFileSync("lib/events/opening-hours.ts", "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022} }).outputText;
const runtime = {exports:{}};
runInNewContext(compiled,{module:runtime,exports:runtime.exports,Date,Array,Number,String},{timeout:3000});
const {dayOpeningSlots,validSlots,openingSummary}=runtime.exports;
const timetable={
 timezone:"Asia/Hong_Kong",
 weekly:[
 {weekday:0,slots:[{start:"09:00",end:"21:00"}]},
 {weekday:1,slots:[{start:"10:00",end:"18:00"}]},
 {weekday:2,slots:[{start:"10:00",end:"18:00"}]},
 {weekday:3,slots:[]},
 {weekday:4,slots:[{start:"10:00",end:"18:00"}]},
 {weekday:5,slots:[{start:"10:00",end:"20:00"}]},
 {weekday:6,slots:[{start:"09:00",end:"21:00"}]},
 ],
 overrides:[
  {date:"2026-10-17",slots:[{start:"11:00",end:"13:00"},{start:"14:00",end:"20:00"}]},
  {date:"2026-10-18",closed:true},
 ]
};
assert.equal(openingSummary(timetable,"2026-10-17"),"11:00–13:00、14:00–20:00");
assert.equal(openingSummary(timetable,"2026-10-18"),"");
assert.equal(openingSummary(timetable,"2026-10-19"),"10:00–18:00");
assert.equal(openingSummary(timetable,"2026-10-21"),"");
assert.equal(openingSummary(timetable,"2026-10-24"),"09:00–21:00");
assert.equal(validSlots([{start:"10:00",end:"11:00"},{start:"10:30",end:"12:00"}]),false);
assert.equal(validSlots([{start:"25:00",end:"26:00"}]),false);
assert.equal(validSlots([{start:"20:00",end:"10:00"}]),false);
assert.equal(validSlots([{start:"09:00",end:"12:00"},{start:"13:00",end:"18:00"}]),true);
console.log("[opening-hours] PASS: weekly hours, weekend variation, split sessions, exceptions, closures, validation");

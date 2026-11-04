import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
const src=(p)=>readFileSync(p,"utf8");
const migration=src("supabase/migrations/20261104010000_parent_member_saved_events_preferences.sql");
for(const table of ["user_saved_events","user_event_preferences"]){
 assert.ok(migration.includes("alter table public."+table+" enable row level security"),table+" RLS missing");
 assert.ok(migration.includes("revoke all on public."+table+" from public, anon, authenticated"),table+" overly broad GRANT");
 assert.ok(migration.includes("(select auth.uid()) = user_id"),"JWT owner must be enforced");
}
assert.ok(migration.includes("primary key (user_id, event_id)"),"Member event ID unique per owner");
assert.ok(migration.includes("to authenticated using ((select auth.uid()) = user_id)"),"Cross-account reads restricted");
assert.ok(!migration.includes("to anon using"),"Never share member records with anonymous visitors");
assert.ok(!migration.includes("service_role"),"No service_role client bypass");

for(const [path,signal] of [
 ["components/auth/parent-email-account.tsx","auth.signUp("],
 ["components/auth/parent-email-account.tsx","auth.signInWithPassword("],
 ["components/auth/parent-email-account.tsx","resetPasswordForEmail("],
 ["app/account/reset-password/page.tsx","auth.updateUser({ password })"],
 ["app/account/page.tsx",'from("user_event_preferences")'],
 ["app/login/page.tsx","<ParentEmailAccount />"],
 ["app/layout.tsx","<MemberSessionSync />"],
 ["components/events/PublicEventCard.tsx","changeSavedEvent(event.id"],
 ["app/events/[id]/page.tsx","changeSavedEvent(eventId"],
 ["app/favorites/page.tsx","changeSavedEvent(id, false)"],
]) assert.ok(src(path).includes(signal),"Cloud membership flow missing "+path+": "+signal);
assert.ok(src("components/auth/member-session-sync.tsx").includes('event === "SIGNED_OUT"'),"Logged-out shared browser cache must be cleared");

const U1="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", U2="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const E1="11111111-1111-4111-8111-111111111111", E2="22222222-2222-4222-8222-222222222222";
const map=new Map(), rows=new Map(), notifications=[];
let user=null;
const storage={
 getItem(key){return map.has(key)?map.get(key):null;},
 setItem(key,val){map.set(key,String(val));},
 removeItem(key){map.delete(key);}
};
const db={
 auth:{async getUser(){return {data:{user},error:null}}},
 from(table){
   assert.equal(table,"user_saved_events");
   return {
     select(){
       let id="";
       const q={
         eq(field,val){assert.equal(field,"user_id");id=val;return q;},
         order(){return q;},
         async limit(){
           if (db.readStarted) db.readStarted();
           if (db.blockRead) await db.blockRead;
           return {data:[...(rows.get(id)||[])].map(event_id=>({event_id})),error:null};
         }
       };
       return q;
     },
     async upsert(payload) {
       for(const item of Array.isArray(payload)?payload:[payload]){
         const saved=rows.get(item.user_id)||new Set();saved.add(item.event_id);rows.set(item.user_id,saved);
       }
       return {error:null};
     },
     delete(){
       let id="",event="";
       const q={eq(field,val){
         if(field==="user_id") id=val;
         if(field==="event_id"){event=val;rows.get(id)?.delete(event);return Promise.resolve({error:null});}
         return q;
       }};
       return q;
     }
   };
 }
};
const js=ts.transpileModule(src("lib/favorites/cloud-sync.ts"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exported={};
runInNewContext(js,{
 exports:exported,module:{exports:exported},
 require(name){assert.equal(name,"@/lib/supabase/client");return {supabase:db}},
 localStorage:storage,
 window:{localStorage:storage,dispatchEvent(event){notifications.push(event.type)}},
 CustomEvent:class {constructor(type){this.type=type}},
}, {timeout:2000});
const {publishSavedIds,readSavedIds,synchronizeCloudFavorites,changeSavedEvent,forgetLocalFavoritesOnLogout}=exported;
publishSavedIds([E1]);
assert.deepEqual([...readSavedIds()],[E1]);
user={id:U1};
assert.equal((await synchronizeCloudFavorites()).loggedIn,true);
assert.ok(rows.get(U1)?.has(E1),"First sign-in must import guest bookmark");
assert.equal((await changeSavedEvent(E2,true)).ok,true);
assert.ok(rows.get(U1)?.has(E2),"Authenticated save must persist to own cloud");
forgetLocalFavoritesOnLogout();
assert.equal(readSavedIds().length,0,"Logout must remove private cache");
user=null;
publishSavedIds([E1]);
user={id:U2};
await synchronizeCloudFavorites();
assert.deepEqual([...rows.get(U2)],[E1],"New account imports only new guest bookmarks");
user={id:U1};
await synchronizeCloudFavorites();
assert.deepEqual([...readSavedIds()].sort(),[E1,E2].sort(),"User switching restores only own cloud bookmarks");
assert.equal((await changeSavedEvent(E1,false)).ok,true);
assert.ok(!rows.get(U1)?.has(E1),"Unsave deletes only own row");
assert.ok(rows.get(U2)?.has(E1),"Unsave cannot affect another user's record");
assert.ok(notifications.includes("hkff:favorites-changed"),"Saved widgets must refresh on sync");
// Network race: a delayed cloud response must not re-populate a user cache
// after SIGNED_OUT on a shared browser.
forgetLocalFavoritesOnLogout();
user={id:U1};
let beginRead;
const started=new Promise(resolve=>{beginRead=resolve;});
let release;
db.blockRead=new Promise(resolve=>{release=resolve;});
db.readStarted=()=>beginRead();
const waiting=synchronizeCloudFavorites();
await started;
forgetLocalFavoritesOnLogout();
user=null;
release();
const stale=await waiting;
assert.ok(stale.error,"Old session must be invalidated while sync is pending");
assert.equal(readSavedIds().length,0,"No private cached bookmarks after delayed signout response");
db.readStarted=null;db.blockRead=null;
console.log("[parent-membership] PASS: RLS contract, signup/auth UI, first import, account switching, logout, save and unsave");

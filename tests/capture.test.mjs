import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import ts from "typescript";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const loadExternal = createRequire(import.meta.url);

// Run the pure TypeScript module with the existing compiler, no new test dependency.
function loadTypeScript(file) {
  const filename = path.resolve(testDirectory, "..", file);
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", source)(specifier => {
    if (specifier.startsWith(".")) {
      return loadTypeScript(path.relative(path.resolve(testDirectory, ".."), path.resolve(path.dirname(filename), `${specifier}.ts`)));
    }
    return loadExternal(specifier);
  }, compiledModule, compiledModule.exports);
  return compiledModule.exports;
}
const { matchContacts } = loadTypeScript("src/lib/contact-matching.ts");
const { demoContacts, demoConferences } = loadTypeScript("src/lib/demo-fixtures.ts");
const { saveCapture, readCaptureState } = loadTypeScript("src/lib/capture-store.ts");
const person = (overrides={}) => ({...demoContacts[0], ...overrides});
test("normalized email and formatting are strong; conflict requires review", () => {
 const result=matchContacts({name:" SARAH   COHEN ",email:" SARAH.COHEN@NORTHSTAR-DEMO.EXAMPLE "},demoContacts);
 assert.equal(result[0].level,"strong"); assert.equal(result[0].requiresReview,false);
 assert.equal(matchContacts({name:"Alex Brown",email:demoContacts[0].email},demoContacts)[0].requiresReview,true);
});
test("nickname and spelling aliases require explicit review",()=>{
 const result=matchContacts({name:"Jon Smith",company:" ACME "},[person({name:"Jonathan Smith",company:"Acme",email:null})]);
 assert.equal(result[0].level,"probable"); assert.equal(result[0].requiresReview,true); assert.ok(result[0].reasons.length);
 assert.equal(matchContacts({name:"Sara Cohen",company:"Northstar Commerce"},demoContacts).length,3);
});
test("job change, name-only and two Alex Browns remain candidates",()=>{
 assert.equal(matchContacts({name:"Sarah Cohen",company:"GlobalPay"},demoContacts)[0].level,"possible");
 assert.equal(matchContacts({name:"Alex Brown"},[person({name:"Alex Brown"}),person({id:demoContacts[1].id,name:"Alex Brown",company:"Other"})]).length,2);
 assert.equal(matchContacts({name:"Sarah Cohen"},demoContacts)[0].level,"weak");
 assert.equal(matchContacts({name:"Completely Different"},demoContacts).length,0);
});
let stored;
globalThis.localStorage={getItem:()=>stored??null,setItem:(_key,value)=>{stored=value;}};
const input={name:"Sarah Cohen",company:"GlobalPay",conferenceId:demoConferences[0].id,notes:"Another meeting",occurredAt:"2026-10-01T10:00:00Z"};
test("same person appends interaction, is idempotent and preserves contact",()=>{
 stored=undefined; const token="40000000-0000-4000-8000-000000000001";
 saveCapture(input,demoContacts[0].id,token); saveCapture(input,demoContacts[0].id,token);
 const state=readCaptureState(); assert.equal(state.contacts.length,demoContacts.length); assert.equal(state.interactions.length,7); assert.deepEqual(state.contacts[0],demoContacts[0]);
});
test("different person creates identity; duplicate email and invalid input rejected",()=>{
 stored=undefined; saveCapture(input,"new","40000000-0000-4000-8000-000000000002");
 assert.equal(readCaptureState().contacts.length,5); assert.deepEqual(readCaptureState().contacts[0],demoContacts[0]);
 assert.throws(()=>saveCapture({...input,email:demoContacts[0].email},"new","40000000-0000-4000-8000-000000000003"),/email belongs/);
 assert.throws(()=>saveCapture({...input,name:" "},"new","40000000-0000-4000-8000-000000000003"));
});
test("failed writes and corrupt state are not silently replaced",()=>{
 stored="bad json"; assert.throws(()=>readCaptureState());
 stored=undefined; globalThis.localStorage.setItem=()=>{throw Error("Storage unavailable")};
 assert.throws(()=>saveCapture(input,"new","40000000-0000-4000-8000-000000000004"),/Storage unavailable/);
});

test("separate meetings for the same person keep one contact across conferences", () => {
 stored=undefined; globalThis.localStorage.setItem=(_key,value)=>{stored=value;};
 saveCapture(input,demoContacts[0].id,"40000000-0000-4000-8000-000000000010");
 saveCapture({...input,conferenceId:demoConferences[8].id},demoContacts[0].id,"40000000-0000-4000-8000-000000000011");
 const state=readCaptureState(); assert.equal(state.contacts.length,4); assert.equal(state.interactions.length,8);
 assert.equal(state.interactions.filter(i=>i.contactId===demoContacts[0].id).length,5);
});
test("different email stays explainable and different person preserves all candidates", () => {
 const raw={...input,email:"other@demo.example"}; const result=matchContacts(raw,demoContacts);
 assert.ok(result.length); assert.ok(result.every(c=>c.requiresReview && c.reasons.length));
 assert.ok(result[0].reasons.some(r=>r.includes("Different email")));
 stored=undefined; saveCapture(raw,"new","40000000-0000-4000-8000-000000000012");
 assert.deepEqual(readCaptureState().contacts.slice(0,4),demoContacts);
 assert.equal(readCaptureState().contacts.length,5);
});
test("chronological history compares instants rather than offset strings", () => {
 const { chronologicalInteractions }=loadTypeScript("src/lib/capture-store.ts");
 const base={id:"a",contactId:demoContacts[0].id,conferenceId:demoConferences[0].id,notes:"",createdAt:input.occurredAt};
 const later={...base,occurredAt:"2026-10-01T09:00:00Z"};
 const earlier={...base,id:"b",occurredAt:"2026-10-01T10:00:00+03:00"};
 const inputList=[later,earlier]; assert.deepEqual(chronologicalInteractions(inputList).map(i=>i.id),["b","a"]);
 assert.deepEqual(inputList,[later,earlier]);
});
test("duplicate normalized emails in saved state are rejected", () => {
 stored=JSON.stringify({contacts:[demoContacts[0],person({id:demoContacts[1].id,email:demoContacts[0].email.toUpperCase()})],interactions:[]});
 assert.throws(()=>readCaptureState(),/duplicate emails/);
});

import * as rt from "@midnight-ntwrk/compact-runtime";
console.log("CompactTypeField exists:", typeof rt.CompactTypeField !== "undefined");
console.log("Has versionString:", rt.versionString);
try { rt.checkRuntimeVersion("0.11.0"); console.log("0.11.0 check: PASS"); } catch(e) { console.log("0.11.0 check: FAIL -", e.message); }
try { rt.checkRuntimeVersion("0.14.0"); console.log("0.14.0 check: PASS"); } catch(e) { console.log("0.14.0 check: FAIL -", e.message); }

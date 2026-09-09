#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const root = process.cwd();
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const head = git("rev-parse", "HEAD");
const branch = git("branch", "--show-current");
const statePath = "docs/PROJECT_STATE.json";
const roadmap = readFileSync(`${root}/docs/ROADMAP.md`, "utf8");
const completed = (roadmap.match(/- \[x\]/gi) || []).length;
const open = (roadmap.match(/- \[ \]/g) || []).length;

const state = {
  project: "Iris",
  repository: "d77167635/ibag",
  branch,
  head,
  generated_at: new Date().toISOString(),
  continuity: {
    master_state: "docs/MASTER_STATE.md",
    architecture: "docs/ARCHITECTURE.md",
    decisions: "docs/DECISIONS.md",
    roadmap: "docs/ROADMAP.md",
    session_handoff: "docs/SESSION_HANDOFF.md",
    source_of_truth: "current GitHub main commit; continuity documents describe verified state and must not override live repository state"
  },
  roadmap: { completed_items: completed, open_items: open },
  environment_transition: {
    status: "in_transition",
    render: "old Render services are being replaced; new service is not yet connected",
    supabase: "current Supabase remains connected to the old environment and is not yet the clean-slate production database",
    plaid: "fresh production-authoritative observations are not established until the environment transition and reset are complete"
  },
  rules: [
    "No fabricated financial data",
    "Provider observations are evidence, not intelligence",
    "Unknown is not zero",
    "Readiness is distinct from publication",
    "No money movement in the current scope",
    "Build by capability, not artifact count"
  ]
};

if (process.argv.includes("--write")) {
  writeFileSync(`${root}/${statePath}`, `${JSON.stringify(state, null, 2)}\n`);
  for (const file of ["docs/MASTER_STATE.md", "docs/SESSION_HANDOFF.md"]) {
    const path = `${root}/${file}`;
    let content = readFileSync(path, "utf8");
    content = content.replace(/(Latest verified continuity checkpoint:\s*`)[^`]+(`)/, `$1${head}$2`);
    content = content.replace(/(Current verified tip before this handoff update:\s*)[^\n]+/, `$1${head}`);
    writeFileSync(path, content);
  }
  console.log(`updated ${statePath} and continuity checkpoints to ${head}`);
} else {
  console.log(JSON.stringify(state, null, 2));
}

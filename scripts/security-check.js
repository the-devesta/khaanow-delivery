#!/usr/bin/env node

const { execFileSync } = require("child_process");
const fs = require("fs");

const blockedPathPatterns = [
  /(^|\/)\.env($|\.)/,
  /(^|\/)credentials($|\/)/,
  /(^|\/)credentials\.json$/,
  /keystore/i,
  /\.(jks|p8|p12|key|mobileprovision|pem)$/i,
  /app\.json\.bak$/,
  /(^|\/)ios_backup($|\/)/,
];

const allowedPathPatterns = [
  /(^|\/)\.env\.example$/,
  /(^|\/)scripts\/security-check\.js$/,
];

const blockedContentPatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bAWS_SECRET_ACCESS_KEY\s*=\s*["']?[^"'\s]+/,
  /\bGOOGLE_CLIENT_SECRET\s*=\s*["']?(?!your[_-]|example|placeholder)[^"'\s]+/i,
  /\bJWT_SECRET\s*=\s*["']?(?!your[_-]|change_me|example|placeholder)[^"'\s]+/i,
  /\bRAZORPAY_KEY_SECRET\s*=\s*["']?(?!xxx|your[_-]|example|placeholder)[^"'\s]+/i,
  /\bWHATSAPP_ACCESS_TOKEN\s*=\s*["']?(?!your[_-]|example|placeholder)[^"'\s]+/i,
];

function gitFiles(args) {
  return execFileSync("git", args, { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

const tracked = gitFiles(["ls-files"]);
const staged = gitFiles(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
const files = Array.from(new Set([...tracked, ...staged]));

const offenders = [];

for (const file of files) {
  if (allowedPathPatterns.some((pattern) => pattern.test(file))) continue;

  if (blockedPathPatterns.some((pattern) => pattern.test(file))) {
    offenders.push(`${file} (private credential path)`);
    continue;
  }

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;

  const content = fs.readFileSync(file, "utf8");
  if (blockedContentPatterns.some((pattern) => pattern.test(content))) {
    offenders.push(`${file} (secret-like content)`);
  }
}

if (offenders.length > 0) {
  console.error("Refusing to continue because private files/secrets are tracked:");
  for (const offender of offenders) console.error(`- ${offender}`);
  console.error("\nMove private values to ignored local files or EAS environment secrets.");
  process.exit(1);
}

console.log("No blocked private credential files found in git-tracked paths.");

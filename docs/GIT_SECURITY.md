# Git Security Policy

## Safe To Track

- `app.json`, `app.config.js`, and `eas.json`
- Public client identifiers such as bundle IDs, package names, EAS project IDs, Firebase project IDs, and restricted client API keys
- `google-services.json` and `GoogleService-Info.plist` when they contain only Firebase client app config
- `.env.example` with placeholder values only

## Never Track

- `.env`, `.env.local`, `.env.production`, or any file containing real secrets
- Android keystores and keystore credential files
- App Store Connect API keys, `.p8`, `.p12`, provisioning profiles, private keys, and certificates
- Service-account JSON files
- Local backup files such as `app.json.bak` or generated native backups

## EAS Builds

EAS Build does not need GitHub to contain private credentials. Keep build profiles in `eas.json`, and store private values in EAS credentials or EAS environment secrets.

Run this before pushing:

```bash
npm run security:check
```

To enable the local pre-commit hook:

```bash
git config core.hooksPath .githooks
```

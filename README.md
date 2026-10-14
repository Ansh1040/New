# CS GATE Study Tracker

A private tracker for the CS–GATE PW course with subject progress, study time, scores, and test completion bars grouped by subject. The site exposes the same records through its private MCP plugin tools:

- `get_study_progress`
- `update_subject_progress`
- `log_study_session`
- `record_test_result`
- `import_pw_snapshot` — saves progress and test cards actually observed in PW; does not fetch PW itself

Use **Sync from PW** with the included [browser extension](browser-extension/README.md) installed in Chrome, Brave or Edge. Open PW and this tracker in the same browser profile. The extension reads loaded All Tests cards and All Classes percentages. Optional auto-sync runs every minute while the tracker is open; refresh PW to load newly completed work. It does not read credentials, cookies, videos or test answers. The downloadable ZIP is built from `browser-extension/` and served at `public/pw-sync-extension.zip`.

Tests are merged by name within a batch. Partial/filtered captures retain existing records and do not establish a complete course inventory. Positive PW attempt counts count as completion unless the card says Resume/In progress. Upcoming cards are excluded from the available-test denominator. Manually recorded scores remain separate and include a subject. Subject names that the reader does not recognize stay unchanged. In Codex's in-app browser, ask the assistant to read PW and call `import_pw_snapshot` instead. No unattended cloud PW connection exists.

The initial percentages are copied from the supplied screenshot on 12 October 2026. Private test snapshots are stored only in the per-user database, not committed in source. Stale state writes are rejected to protect concurrent edits.

Records are stored in the Site's D1 database and scoped to the signed-in Site user. The Site uses the platform's private sign-in and access controls.

## Development

This project uses the Sites Vinext starter. Install locked dependencies with `npm run install:ci`, generate the D1 migration with `npm run db:generate`, and build with the Sites `build-site.mjs` helper. The MCP server is implemented at `/mcp`.

Run `node scripts/check-pw-sync.mjs` for import/counting/reader regression checks and `node node_modules/typescript/bin/tsc --noEmit` for types. PW sync uses the existing per-user JSON record, so no database migration is needed.

The extension uses [Chrome's isolated content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting). End-to-end extension testing requires installation in a supported browser; Codex's in-app browser cannot load the extension.

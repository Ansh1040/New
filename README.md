# CS GATE Study Tracker

A private tracker for the CS–GATE PW course. The dashboard keeps a manually refreshed PW completion snapshot, study sessions, and practice test scores. The site also exposes the same records through its private MCP plugin tools:

- `get_study_progress`
- `update_subject_progress`
- `log_study_session`
- `record_test_result`

The initial percentages are copied from the PW screenshot supplied on 12 October 2026. PW does not provide a documented integration in this project, so percentages need to be updated by the student; the tracker never asks for PW credentials.

Records are stored in the Site's D1 database and scoped to the signed-in Site user. The Site uses the platform's private sign-in and access controls.

## Development

This project uses the Sites Vinext starter. Install locked dependencies with `npm run install:ci`, generate the D1 migration with `npm run db:generate`, and build with the Sites `build-site.mjs` helper. The MCP server is implemented at `/mcp`.

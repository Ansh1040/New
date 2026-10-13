# Manual progress publishing

The tracker works independently of GPT. With the PW extension connected, click **Sync & refresh** to import loaded PW subject/test cards and update saved tracker data. No scheduled PW or GPT refresh runs.

Connect GitHub once in the tracker’s **GitHub sharing** section:

1. Create a fine-grained token at https://github.com/settings/personal-access-tokens/new.
2. Select only **Ansh1040/New**. Grant **Contents: Read and write**, and choose an expiry date.
3. Enter the token directly into the signed-in tracker’s password field and click **Connect GitHub securely**. Do not add it to source files or chat.

The button becomes **Sync, refresh & publish**. It saves PW progress, then commits a sanitized snapshot to **main → docs/progress.json**. GitHub Pages rebuilds https://ansh1040.github.io/New/. The shared page checks for updates every minute and when focused.

**Publish saved progress** publishes manual tracker edits without fetching PW. If publishing fails, saved tracker data is retained. Retry sharing or reconnect after token expiry.

Tokens are encrypted using AES-GCM with a random IV and per-user authenticated data, stored in a user-scoped D1 row, and never returned to the browser. The encryption key is the Sites runtime secret **GITHUB_TOKEN_ENCRYPTION_KEY**. Preserve that key across deployments; rotating it requires reconnecting GitHub. Never commit its value.

The server can update only the fixed GitHub path above. Shared snapshots contain subject percentages and test counts, without PW batch IDs, credentials, private sessions, or score logs.

The countdown dates are user targets, both at midnight IST: course completion **1 January 2027**, final paper **1 February 2027**.

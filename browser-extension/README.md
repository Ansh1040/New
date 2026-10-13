# PW browser sync

1. Download the extension ZIP from the tracker and extract it.
2. In Chrome, Brave, or Edge open the Extensions page and enable Developer mode.
3. Select **Load unpacked** and select the extracted folder containing manifest.json.
4. Open the tracker and PW in that same browser/profile. Reload the tracker after installing.
5. In PW open your batch's **All Tests**, select the **All Tests** tab, and clear attempt filters. Scroll to load all cards if necessary. Keep another tab on **All Classes** to sync subject percentages too.
6. Click **Sync from PW** on the tracker. Optionally enable **Auto-sync every minute while this tracker is open**.

The extension reads loaded card titles, subject percentages, attempt counts and statuses from PW's rendered page. It sends those fields to the exact private tracker origin through its open tab. It cannot read credentials or request PW cookies. It never starts a test, submits answers, plays lectures, changes PW data, or navigates your tabs.

Only loaded cards are captured. A filtered or partially loaded list is not a complete course inventory. Previously imported tests are retained, and repeated imports update matching names instead of duplicating them. Completed counts use PW's positive attempt count unless the card says Resume/In progress. Upcoming cards are excluded from the available-test denominator. Marks remain manually recorded.

The extension does not run while the tracker is closed, and a stale PW page remains stale until you refresh it. It cannot be installed in the Codex in-app browser; use Chrome, Brave, or Edge. To sync in Codex, ask the assistant to read your open PW page and import its observed snapshot.

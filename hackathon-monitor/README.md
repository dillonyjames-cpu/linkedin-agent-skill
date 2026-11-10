# Japan hackathon monitor

Keeps one tracker up to date from the hackathon LINE group, your iMessage
chats, Gmail, Drive and Calendar.

```
LINE group ──(bot)──────┐
                        ├──> Google Sheet "messages" tab ──┐
iMessage (your Mac) ────┘                                  ├──> daily Claude task ──> tracker + summary
Gmail / Drive / Calendar ──────────────────────────────────┘
```

Nothing here sends messages. The bot only listens, the Mac script only reads,
and the daily task only writes to the tracker.

| file | what it is |
| --- | --- |
| `line_webhook.gs` | Apps Script for the Google Sheet. Receives LINE and iMessage messages and adds rows. |
| `imessage_sync.py` | Runs on your Mac every hour. Sends new messages from chosen chats to the sheet. |
| `install_mac.sh` | Sets up the hourly run on the Mac. |
| `config.example.json` | Template for the Mac script's settings. |
| `AGENT_PROMPT.md` | What the daily Claude task does. |

Setup takes about 30 minutes. Do the steps in order.

## 1. The Google Sheet (10 min)

1. Create a Google Sheet called **Japan Hackathon Feed**.
2. **Extensions > Apps Script.** Delete what is there, paste all of
   `line_webhook.gs`, and save.
3. In the function menu at the top, pick **setup** and click **Run**. Approve
   the permissions it asks for. A `messages` tab appears in the sheet.
4. Make a secret for the Mac. In Terminal:
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
5. **Project Settings (gear) > Script properties > Add**:
   `MAC_SHARED_SECRET` = the value from step 4.
6. **Deploy > New deployment > Web app.** Execute as **Me**, Who has access
   **Anyone**. Copy the web app URL (ends in `/exec`). Keep it private; it is
   the only door into the sheet.

## 2. The LINE bot (10 min)

1. Go to [LINE Official Account Manager](https://manager.line.biz) and create
   a free account (for example "MXP Hackathon Notes").
2. **Settings > Messaging API > Enable Messaging API**, and pick or create a
   provider.
3. Open the channel in the [LINE Developers console](https://developers.line.biz):
   - **Messaging API tab:** issue a **Channel access token (long-lived)**.
     Set **Webhook URL** to the web app URL, turn **Use webhook** on, and
     leave **Webhook redelivery** off.
   - **Basic settings tab:** copy **Your user ID** (starts with `U`).
4. Back in Apps Script, add two more Script properties:
   `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_BOT_USER_ID`.
5. In Official Account Manager:
   - **Response settings:** auto-response **off**, greeting message **off**,
     webhook **on**.
   - **Account settings:** allow the account to **join group chats**.
6. Add the bot as a friend (its QR code is on the home screen), then invite it
   into the hackathon LINE group. **Tell the group** you added a bot that keeps
   notes of the chat for the organizing team.
7. A row saying `Bot joined. Group ID: C...` appears in the sheet. Add a
   Script property `ALLOWED_GROUP_IDS` with that ID, so only this group is
   logged if the bot is ever added somewhere else.
8. Send a test message in the group and check that it shows up in the sheet.

Notes: the bot only sees messages sent after it joins. The **Verify** button
in the LINE console may show an error, because Apps Script answers with a
redirect. The messages still arrive; trust the test message, not the button.
Receiving messages is free on LINE's free plan.

## 3. iMessage on your Mac (10 min)

1. Put this folder on your Mac (download the repo, or just this folder).
2. In Terminal, in this folder:
   ```bash
   cp config.example.json config.json
   ```
   Open `config.json` and fill in `webapp_url` and `shared_secret`.
3. Find the chat names to watch:
   ```bash
   python3 imessage_sync.py --list-chats
   ```
   If it says it can't open the database, give Terminal Full Disk Access
   (**System Settings > Privacy & Security > Full Disk Access**) and try again.
   Put the names or IDs of the hackathon chats in `chats` in `config.json`.
   Only those chats are ever read. Optionally map phone numbers to names under
   `contacts`.
4. Preview what would be sent (sends nothing):
   ```bash
   python3 imessage_sync.py --dry-run
   ```
   The first run goes back `backfill_days` (30 by default).
5. Install the hourly run:
   ```bash
   bash install_mac.sh
   ```
   It prints the exact python path that needs Full Disk Access. Add that path
   too, even if Terminal already has it, because the hourly job runs without
   Terminal.

The Mac has to be on and logged in for iMessage to sync. Messages that come in
while it is off are picked up at the next run.

To stop it:
```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.hackathon-monitor.imessage-sync.plist
```

## 4. The daily tracker

Once messages are reaching the sheet, ask Claude to create the daily scheduled
task from `AGENT_PROMPT.md`, with the event details, keywords and where the
tracker should live.

## Privacy

- The sheet holds other people's messages. Keep it shared only with the
  organizing team, and tell the LINE group the bot is there.
- `config.json` holds the secret; it is git-ignored. Don't share it.
- The Mac script reads only the chats listed in `config.json`, opens the
  Messages database read-only, and never changes it.

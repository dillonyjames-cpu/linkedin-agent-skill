#!/usr/bin/env python3
"""Copy new messages from chosen iMessage chats to the hackathon Google Sheet.

Runs on your Mac. Reads ~/Library/Messages/chat.db read-only, picks out only
the chats named in config.json, and posts any messages it has not sent before
to the Apps Script web app (line_webhook.gs), which appends them to the sheet.

    python3 imessage_sync.py --list-chats    # find the chat names to watch
    python3 imessage_sync.py --dry-run       # print what would be sent
    python3 imessage_sync.py                 # send new messages

Needs Full Disk Access for the python3 that runs it (see README.md).
No third-party packages.
"""
import argparse
import datetime as dt
import json
import os
import sqlite3
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
STATE_DIR = os.path.expanduser("~/.hackathon-monitor")
STATE_FILE = os.path.join(STATE_DIR, "imessage_state.json")
DEFAULT_DB = os.path.expanduser("~/Library/Messages/chat.db")
APPLE_EPOCH = dt.datetime(2001, 1, 1, tzinfo=dt.timezone.utc)
BATCH = 200


def load_config(path):
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    for key in ("webapp_url", "shared_secret", "chats"):
        if not cfg.get(key):
            sys.exit(f"config.json is missing '{key}'")
    return cfg


def connect(db_path):
    try:
        return sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    except sqlite3.OperationalError as e:
        sys.exit(f"Cannot open {db_path}: {e}\n"
                 "Give Full Disk Access to this python3 (see README.md).")


def apple_time(value):
    if not value:
        return ""
    secs = value / 1e9 if value > 1e11 else value  # ns on modern macOS
    return (APPLE_EPOCH + dt.timedelta(seconds=secs)).isoformat().replace("+00:00", "Z")


def decode_attributed_body(blob):
    """Pull the plain text out of the typedstream blob newer macOS stores."""
    if not blob:
        return ""
    parts = bytes(blob).split(b"NSString", 1)
    if len(parts) < 2:
        return ""
    data = parts[1][5:]
    if not data:
        return ""
    if data[0] == 0x81:
        length, start = int.from_bytes(data[1:3], "little"), 3
    elif data[0] == 0x82:
        length, start = int.from_bytes(data[1:4], "little"), 4
    else:
        length, start = data[0], 1
    return data[start:start + length].decode("utf-8", errors="replace")


def list_chats(conn):
    rows = conn.execute("""
        SELECT c.display_name, c.chat_identifier, COUNT(cmj.message_id), MAX(m.date)
        FROM chat c
        JOIN chat_message_join cmj ON cmj.chat_id = c.ROWID
        JOIN message m ON m.ROWID = cmj.message_id
        GROUP BY c.ROWID ORDER BY MAX(m.date) DESC LIMIT 40""").fetchall()
    print("Most recent 40 chats (put display name or identifier in config.json):\n")
    for name, ident, count, last in rows:
        print(f"  {apple_time(last)[:16]}  {count:>6} msgs  name={name or '-'!r}  id={ident!r}")


def fetch_new(conn, chats, after_rowid, contacts):
    marks = ",".join("?" * len(chats))
    rows = conn.execute(f"""
        SELECT m.ROWID, m.guid, m.date, m.is_from_me, h.id, m.text, m.attributedBody,
               COALESCE(NULLIF(c.display_name, ''), c.chat_identifier)
        FROM message m
        JOIN chat_message_join cmj ON cmj.message_id = m.ROWID
        JOIN chat c ON c.ROWID = cmj.chat_id
        LEFT JOIN handle h ON h.ROWID = m.handle_id
        WHERE m.ROWID > ?
          AND (c.display_name IN ({marks}) OR c.chat_identifier IN ({marks}))
        ORDER BY m.ROWID""", [after_rowid, *chats, *chats]).fetchall()
    out = []
    for rowid, guid, date, from_me, handle, text, body, chat in rows:
        text = text or decode_attributed_body(body)
        if not text or text == "￼":
            text = "[attachment]"
        sender = "me" if from_me else contacts.get(handle or "", handle or "(unknown)")
        out.append({"rowid": rowid, "guid": guid, "timestamp": apple_time(date),
                    "chat": chat, "sender": sender, "text": text})
    return out


def post(cfg, messages):
    payload = json.dumps({
        "source": "imessage",
        "secret": cfg["shared_secret"],
        "messages": [{k: m[k] for k in ("guid", "timestamp", "chat", "sender", "text")}
                     for m in messages],
    }).encode("utf-8")
    req = urllib.request.Request(cfg["webapp_url"], data=payload,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        if res.status >= 400:
            raise RuntimeError(f"web app returned {res.status}")


def read_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}


def write_state(state):
    os.makedirs(STATE_DIR, exist_ok=True)
    tmp = STATE_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(state, f)
    os.replace(tmp, STATE_FILE)


def start_rowid(conn, days):
    """First run: start from messages newer than `days` days ago."""
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)
    ns = int((cutoff - APPLE_EPOCH).total_seconds() * 1e9)
    row = conn.execute("SELECT MAX(ROWID) FROM message WHERE date < ?", [ns]).fetchone()
    return row[0] or 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=os.path.join(HERE, "config.json"))
    ap.add_argument("--db", default=DEFAULT_DB)
    ap.add_argument("--list-chats", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    conn = connect(args.db)
    if args.list_chats:
        list_chats(conn)
        return

    cfg = load_config(args.config)
    state = read_state()
    after = state.get("last_rowid")
    if after is None:
        after = start_rowid(conn, int(cfg.get("backfill_days", 30)))

    messages = fetch_new(conn, cfg["chats"], after, cfg.get("contacts", {}))
    if args.dry_run:
        for m in messages:
            print(f"{m['timestamp']}  [{m['chat']}] {m['sender']}: {m['text'][:120]}")
        print(f"\n{len(messages)} message(s) would be sent. Nothing was sent.")
        return

    sent = 0
    for i in range(0, len(messages), BATCH):
        chunk = messages[i:i + BATCH]
        post(cfg, chunk)
        state["last_rowid"] = chunk[-1]["rowid"]
        write_state(state)
        sent += len(chunk)
    if not messages:
        state.setdefault("last_rowid", after)
        write_state(state)
    print(f"{dt.datetime.now():%Y-%m-%d %H:%M}  sent {sent} message(s)")


if __name__ == "__main__":
    main()

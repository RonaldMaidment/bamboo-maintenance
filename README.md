# Bamboo Maintenance Tracker

**Live site:** https://ronaldmaidment.github.io/bamboo-maintenance/

This is the link to share with staff. It's a static page hosted free on GitHub Pages, and it always reflects live data — no one needs to install anything, just open the link.

## How it works

- **Anyone** can submit a maintenance request: name, title, location, details.
- **Manager sign-in** (top right, shared PIN `2468`) unlocks allocating a request to a person and setting a priority (Low/Medium/High/Urgent), plus deleting bad entries.
- **Anyone** can mark a task complete (enters their name). Completed tasks move automatically into the **Completed log** tab, which is searchable, exportable to CSV, and clearable by the manager once archived.

## Where the data lives

There's no server to run or pay for. Data is stored in a Google Sheet, and a small Google Apps Script acts as the API between the website and that sheet:

- **Sheet:** search your Google Drive for "Bamboo Maintenance Tracker Data" (created automatically the first time the script ran).
- **Apps Script project:** open script.google.com and look for "Untitled project" under ronaldmaidment.github.io's connected account — this is the code that reads/writes the sheet. Consider renaming both for clarity.

## Changing the manager PIN

1. Open the Apps Script project (link above) → `Code.gs`.
2. Change the line `const MANAGER_PIN = '2468';` to your new code.
3. Deploy menu → Manage deployments → pencil icon → Version: "New version" → Deploy. (This keeps the same live URL — you don't need to touch the website.)

## Updating the website itself

The site's files (`index.html`, `style.css`, `app.js`) live in the GitHub repo `RonaldMaidment/bamboo-maintenance`. Edit them there (or re-upload new versions via Add file → Upload files on github.com) and GitHub Pages redeploys automatically within a minute or two.

## Backing up the log

Use the **Export CSV** button on the Completed log tab any time before clearing it, if you want to keep a permanent record outside the sheet.

## A note on the manager PIN

This is a lightweight shared-PIN gate, not individual logins — enough to stop casual team members from reassigning tasks, but anyone with the PIN can act as manager. If you later want per-person manager accounts, that's a bigger addition — just ask.

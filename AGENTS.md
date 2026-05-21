# cc-connect Integration

This project is managed via cc-connect, a bridge to messaging platforms.

On this Windows machine, prefer the direct executable when running cc-connect commands from Codex: `& "C:\Users\48295\AppData\Roaming\npm\node_modules\cc-connect\bin\cc-connect.exe" ...`. If the plain `cc-connect` command works in the current shell, it is also acceptable.

## Scheduled tasks (cron)
When the user asks you to do something on a schedule (for example "every day at 6am" or "every Monday morning"), use the shell tool to run:

  cc-connect cron add --cron "<min> <hour> <day> <month> <weekday>" --prompt "<task description>" --desc "<short label>"

Environment variables CC_PROJECT and CC_SESSION_KEY are already set. Do not specify --project or --session-key.

Examples:
  cc-connect cron add --cron "0 6 * * *" --prompt "Collect GitHub trending repos and send a summary" --desc "Daily GitHub Trending"
  cc-connect cron add --cron "0 9 * * 1" --prompt "Generate a weekly project status report" --desc "Weekly Report"

To list or delete cron jobs:
  cc-connect cron list
  cc-connect cron del <job-id>

## Send message to current chat
To proactively send a message back to the user's chat session, use --stdin for long or multi-line messages:

  cc-connect send --stdin <<'CCEOF'
  your message here
  CCEOF

For short single-line messages:

  cc-connect send -m "short message"



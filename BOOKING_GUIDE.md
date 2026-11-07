# Book a call — setup guide

The site has a **Book a call** page at `/#book` (linked from the Contact page and the footer).
Visitors pick a time there, and **Calendly** does the rest: it creates a video link and emails it,
with a calendar invite, to both the visitor and the studio.

You set this up once, in about 10 minutes.

## 1. Create the Calendly account

1. Sign up at <https://calendly.com> with the **studio inbox** (`frxcxstudio@gmail.com`).
   Booking notifications go to this address, so both of you see every meeting.
2. When asked, **connect the studio Google Calendar**. Busy times are then blocked automatically
   and each booking appears in the calendar.

The free plan is enough for one type of call.

## 2. Create the call

In Calendly: **Create → One-on-one**, then set:

| Setting | Suggested value |
|---|---|
| Event name | `Intro call with FRZZY` |
| Duration | 30 min |
| Location | **Google Meet** (or Zoom, after connecting it under Integrations). Calendly makes a fresh link for every booking. |
| Availability | Your working hours, time zone **India (IST)**. Visitors see times in their own zone. |
| Limits | Minimum notice of 4 hours and a 15 min buffer after each call, so nobody books "in 5 minutes". |

**Invitee questions** (Booking page options → Invitee questions). These answers arrive with every booking:

- What do you need? (Motion, 3D, branding, …)
- Company or brand name
- Rough timeline / budget (optional)

## 3. Connect it to the website

1. In Calendly, open the event and click **Copy link**. It looks like
   `https://calendly.com/frzzy-studio/intro-call`.
2. Paste it into `.env.local`:
   ```
   NEXT_PUBLIC_CALENDLY_URL="https://calendly.com/frzzy-studio/intro-call"
   ```
3. Restart the dev server (`Ctrl+C`, then `npm run dev`) and open <http://localhost:3000/#book>.

**On the live site:** add the same `NEXT_PUBLIC_CALENDLY_URL` in your host's environment
settings (e.g. Vercel → Project → Settings → Environment Variables) and **redeploy**. The value
is baked in at build time.

## What happens when someone books

1. The visitor picks a slot and answers your questions. If they already typed their name and
   email on the Contact page, those are pre-filled.
2. The page shows "You're booked ✓".
3. **The visitor** gets an email with the meeting link, a calendar invite, and links to reschedule or cancel.
4. **The studio** gets an email with their name, email, answers and the meeting link, and the
   meeting shows up in the Google Calendar.
5. Calendly sends reminders before the call.

## Good to know

- **Not set up yet?** The page shows "Online booking opens soon" with the studio email, so it is
  never a dead end.
- **Colours:** the widget uses FRZZY colours (black, ivory, volt) on paid Calendly plans. On the
  free plan Calendly shows its standard white widget inside the page frame, which still works fine.
- **Security:** the site's Content-Security-Policy in `next.config.ts` already allows Calendly frames.
  The page refuses to embed any link that isn't `https://calendly.com/…`.
- Code: `components/frzzy/calendly-embed.tsx` (embed) and the `book` view in `app/page.tsx`.

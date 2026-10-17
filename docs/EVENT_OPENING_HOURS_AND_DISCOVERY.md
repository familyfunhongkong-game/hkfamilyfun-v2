# Event opening times and daily ordering — integration plan

Status: **core date-aware helper and contract tests added on feature branch only**. NOT integrated with Merchant/Admin form, database schema, public query, or production.

## Publishing model
- Event publication date (published_at) and last edit (updated_at) must remain distinct. Editing a months-old listing does not make it newly published.
- Store a parent event and a separate opening schedule. Model either a one-off date/time session, weekly recurring weekdays with independent 0..N non-overlapping daily time slots, or selected explicit dates.
- Add date overrides that take precedence over recurring rules, including closures, special opening sessions and cancelled/sold-out dates.
- All date matching and start-time display use Asia/Hong_Kong, not the visitor's device timezone.
- Invalid / missing hours must not be interpreted as midnight or 09:00. Mark 'time to be confirmed' if event occurs but has no reliable opening time.
- The current recurrence implementation treats a nonweekly multi-day event as occurring every day in its date range. Selected-dates activities MUST not be represented that way.

## Proposed durable schema (migration still needed)
- event_opening_rules: id, event_id, weekday (0=Sunday..6=Saturday), start_local_time, end_local_time; multiple rows allowed for split sessions, zero rows for a closed weekday.
- event_opening_exceptions: id, event_id, local_date, is_closed, start_local_time, end_local_time; group by local_date, multiple slots for split sessions.
- event_occurrences: id, event_id, local_date, start_local_time, end_local_time, status (scheduled/cancelled/sold_out), capacity/booking_status as available; materialize indexed future dates if necessary.
- event schedule_mode: one_off / selected_dates / weekly; event start_date/end_date bound recurrence, with no end date allowed only under an explicit permanent-venue policy.
- Foreign keys, RLS, and indexes on (local_date,start_local_time,event_id) are required. Merchant ownership and Admin approval apply to schedule edits.
- Migration should translate existing recurrence weekdays and event.time conservatively, never infer missing end times.

## Public '/today' behavior
1. Filter approved published records by actual occurrence on current Hong Kong date.
2. Respect closed dates, missing weekdays, cancellation, sold-out policy, and occurrence-specific time.
3. Make one card per parent event; if multiple sessions exist today, display all session times.
4. Group by morning/afternoon/evening using the first relevant session; never duplicate parent event in separate groups without an explicit design choice.
5. Within a period sort by earliest actual session start time ascending, then published_at descending, then stable ID. Missing times last.
6. On a separate home 'discover' feed, balance one-off/new events against evergreen venues; avoid claiming strict chronological ordering when promoting new events.
7. Show 'open now' only if Hong Kong current clock is between a verified session start and end; otherwise 'opens at', 'closed today' or 'time to confirm'.
8. If a session finished today, retain it only where 'full day schedule' is intended; do not portray it as still open.
9. Feature/promoted placements must be visibly labeled and must not corrupt the strict chronological /today view.

## Merchant/Admin interface
- Single-day, selected dates, weekly recurrence, daily hours, and exceptions as form modes.
- Seven weekday toggles with separate day slots, '+ Add time slot', 'closed', 'copy Monday to weekdays', 'copy Saturday/Sunday'.
- Calendar exceptions with closure/holiday hours; mobile friendly and accessible labels.
- Preview real upcoming dates and Hong Kong-local opening times before submission.
- Notify admin of material schedule changes; published changes need a defined reapproval or safe trusted-edit policy.

## Acceptance gates
- Monday-Friday versus Saturday/Sunday variation, Friday-only and Fri-Sun-only events.
- Closed Wednesdays, special Saturday exceptions, two sessions in one day, cancellation/sold-out.
- Holidays; timezone boundary while admin is in Canada; midnight rollover; DST in other visitor zones.
- Tie-breaking at same start time: newest published wins, not most recently edited.
- Nonrecurring date range must not imply daily operation for selected dates.
- Existing event records must preserve appearance during schema migration, with unconfirmed data flagged.
- Run existing check:today-timeline, check:event-calendar, check:approval-workflow, check:merchant-preview, build/type-check and authenticated E2E before merge/deploy.

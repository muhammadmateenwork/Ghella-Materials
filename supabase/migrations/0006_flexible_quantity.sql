-- Real warehouse stock isn't always a clean integer count (e.g. "approx 10
-- bundles", "many", "14+"). The reservation system still needs a real
-- number to prevent overbooking, so quantity itself stays a required
-- integer — these two columns let the admin describe it more accurately
-- without changing that math:
--   unit: what's being counted ("bundles", "rolls", "coils", ...) — shown
--     next to the number instead of a bare integer.
--   is_approximate: when true, the UI shows the count as an estimate
--     ("~14 bundles" / "14+ bundles") rather than an exact figure.

alter table public.items
  add column unit text,
  add column is_approximate boolean not null default false;

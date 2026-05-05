-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Helper to (re)schedule Steadfast jobs idempotently
DO $$
DECLARE
  v_url   text := 'https://izeabmhtxtrelfqgkuua.supabase.co/functions/v1/steadfast-courier';
  v_anon  text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6ZWFibWh0eHRyZWxmcWdrdXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjMzMzksImV4cCI6MjA5MzUzOTMzOX0.ksgeJhbbDI0AsnR9IaP_BjurbGHHODuHAXf4AgUWI0Q';
BEGIN
  -- unschedule if exists then re-create
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('steadfast-auto-submit-2min', 'steadfast-bulk-sync-15min');

  PERFORM cron.schedule(
    'steadfast-auto-submit-2min',
    '*/2 * * * *',
    format($f$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','apikey', %L),
        body := jsonb_build_object('action','auto_submit_pending')
      );
    $f$, v_url, v_anon)
  );

  PERFORM cron.schedule(
    'steadfast-bulk-sync-15min',
    '*/15 * * * *',
    format($f$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','apikey', %L),
        body := jsonb_build_object('action','bulk_sync')
      );
    $f$, v_url, v_anon)
  );
END $$;

INSERT INTO public.system_settings (key, value)
VALUES ('courier_auto_submit', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value)
VALUES ('courier_webhook_secret', jsonb_build_object('secret', encode(gen_random_bytes(24), 'hex')))
ON CONFLICT (key) DO NOTHING;

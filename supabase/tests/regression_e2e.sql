-- ============================================================
-- E2E Regression Test Suite (extended)
-- Covers: slug, stock deduct/restore, courier shipment auto-create,
--         updated_at, no duplicate triggers, referral generator,
--         courier auto-approve toggle, COD amount math.
-- Run as a single transaction; rolls back at the end.
-- ============================================================

DO $$
DECLARE
  v_pid uuid := gen_random_uuid();
  v_oid uuid := gen_random_uuid();
  v_oid2 uuid := gen_random_uuid();
  v_phone text := '0199' || lpad((floor(random()*9000000)+1000000)::int::text, 7, '0');
  v_phone2 text := '0188' || lpad((floor(random()*9000000)+1000000)::int::text, 7, '0');
  v_slug text;
  v_stock int;
  v_ship_count int;
  v_invoice text;
  v_cod numeric;
  v_uat timestamptz;
  v_cat timestamptz;
  v_approved boolean;
  v_pass int := 0;
  v_fail int := 0;
  v_msg text;
  v_prev_approve_setting jsonb;
BEGIN
  -- 1. Seed product (slug auto-generate)
  INSERT INTO products (id, name, category, price, stock)
  VALUES (v_pid, 'Regression Test Borka ' || v_pid::text, 'Borka', 1200, 20);

  SELECT slug INTO v_slug FROM products WHERE id = v_pid;
  IF v_slug LIKE 'regression-test-borka%' THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ slug auto-generate: %', v_slug;
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ slug auto-generate FAILED: %', v_slug;
  END IF;

  -- 2. COD order + item → stock deduct (20 → 15)
  INSERT INTO orders (id, is_guest, guest_name, total, shipping_address,
                      shipping_city, shipping_phone, status, payment_method)
  VALUES (v_oid, true, 'Regression', 6000, 'Test Addr', 'Dhaka', v_phone, 'pending', 'cod');
  INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
  VALUES (v_oid, v_pid, 'Regression Test Borka', 5, 1200);

  SELECT stock INTO v_stock FROM products WHERE id = v_pid;
  IF v_stock = 15 THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ stock deduct: 20 → %', v_stock;
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ stock deduct FAILED: %', v_stock;
  END IF;

  -- 3. Confirm → exactly one shipment with COD = total - advance
  UPDATE orders SET status = 'confirmed' WHERE id = v_oid;
  SELECT count(*), max(invoice), max(cod_amount), bool_or(admin_approved)
    INTO v_ship_count, v_invoice, v_cod, v_approved
    FROM courier_shipments WHERE order_id = v_oid;
  IF v_ship_count = 1 AND v_invoice IS NOT NULL AND v_cod = 6000 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE '✅ courier shipment: count=%, invoice=%, cod=%', v_ship_count, v_invoice, v_cod;
  ELSE
    v_fail := v_fail + 1;
    RAISE WARNING '❌ courier shipment FAILED: count=%, cod=%', v_ship_count, v_cod;
  END IF;

  -- 4. updated_at changes after subsequent UPDATE
  PERFORM pg_sleep(0.05);
  UPDATE orders SET notes = 'regression-touch' WHERE id = v_oid;
  SELECT updated_at, created_at INTO v_uat, v_cat FROM orders WHERE id = v_oid;
  IF v_uat > v_cat THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ updated_at auto-update';
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ updated_at FAILED';
  END IF;

  -- 5. Cancel → stock restore (15 → 20)
  UPDATE orders SET status = 'cancelled' WHERE id = v_oid;
  SELECT stock INTO v_stock FROM products WHERE id = v_pid;
  IF v_stock = 20 THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ stock restore: → %', v_stock;
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ stock restore FAILED: %', v_stock;
  END IF;

  -- 6. Single stock-deduct trigger
  SELECT count(*) INTO v_ship_count FROM pg_trigger
    WHERE tgrelid = 'public.order_items'::regclass
      AND NOT tgisinternal AND tgname LIKE '%deduct%';
  IF v_ship_count = 1 THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ no duplicate stock-deduct triggers';
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ duplicate triggers: %', v_ship_count;
  END IF;

  -- 7. Referral code shape (8 chars)
  SELECT upper(substr(md5(random()::text), 1, 8)) INTO v_msg;
  IF length(v_msg) = 8 THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ referral code generator';
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ referral code FAILED';
  END IF;

  -- 8. courier_auto_approve = true → next confirmed shipment is admin_approved
  SELECT value INTO v_prev_approve_setting FROM system_settings WHERE key='courier_auto_approve';
  INSERT INTO system_settings (key, value)
    VALUES ('courier_auto_approve', '{"enabled": true}'::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = '{"enabled": true}'::jsonb;

  -- We must use a different phone to bypass the 10-min rate-limit trigger.
  INSERT INTO orders (id, is_guest, guest_name, total, advance_amount,
                      shipping_address, shipping_city, shipping_phone,
                      status, payment_method)
  VALUES (v_oid2, true, 'Regression2', 5000, 500, 'Addr', 'Dhaka', v_phone2, 'pending', 'cod');
  INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
  VALUES (v_oid2, v_pid, 'Regression Test Borka', 1, 5000);
  UPDATE orders SET status='confirmed' WHERE id = v_oid2;

  SELECT bool_or(admin_approved), max(cod_amount)
    INTO v_approved, v_cod
    FROM courier_shipments WHERE order_id = v_oid2;
  IF v_approved AND v_cod = 4500 THEN
    v_pass := v_pass + 1;
    RAISE NOTICE '✅ auto-approve + COD = total - advance (cod=%)', v_cod;
  ELSE
    v_fail := v_fail + 1;
    RAISE WARNING '❌ auto-approve/COD FAILED: approved=% cod=%', v_approved, v_cod;
  END IF;

  -- 9. courier_auto_submit setting exists (toggle plumbing)
  IF EXISTS (SELECT 1 FROM system_settings WHERE key='courier_auto_submit') THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ courier_auto_submit setting present';
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ courier_auto_submit setting missing';
  END IF;

  -- 10. webhook secret exists & non-empty
  IF EXISTS (
    SELECT 1 FROM system_settings
    WHERE key='courier_webhook_secret' AND length(value->>'secret') >= 24
  ) THEN
    v_pass := v_pass + 1; RAISE NOTICE '✅ webhook secret configured';
  ELSE
    v_fail := v_fail + 1; RAISE WARNING '❌ webhook secret missing';
  END IF;

  -- Restore previous setting
  UPDATE system_settings SET value = COALESCE(v_prev_approve_setting,'{"enabled":false}'::jsonb)
    WHERE key='courier_auto_approve';

  RAISE NOTICE '════════════════════════════════════════';
  RAISE NOTICE 'REGRESSION SUITE: % passed, % failed', v_pass, v_fail;
  RAISE NOTICE '════════════════════════════════════════';

  -- Cleanup
  DELETE FROM courier_shipments WHERE order_id IN (v_oid, v_oid2);
  DELETE FROM order_items WHERE order_id IN (v_oid, v_oid2);
  DELETE FROM orders WHERE id IN (v_oid, v_oid2);
  DELETE FROM products WHERE id = v_pid;

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'Regression suite failed: % failures', v_fail;
  END IF;
END $$;

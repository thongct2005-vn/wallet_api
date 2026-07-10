
-- =================================================================================
-- MERCHANT PORTAL PAGINATION DEMO SEED
-- =================================================================================
-- This script safely inserts demo data for pagination testing.
-- It DOES NOT truncate, drop, or delete any existing data.
-- =================================================================================

DO $$
DECLARE
  v_merchant_id UUID;
  v_user_id UUID;
  v_wallet_id UUID;
BEGIN
  -- Get the first active merchant
  SELECT id INTO v_merchant_id FROM public.merchants WHERE merchant_code = 'MER000002' LIMIT 1;
  
  IF v_merchant_id IS NULL THEN
    RAISE EXCEPTION 'Merchant with code MER000002 not found. Please run the base seed first.';
  END IF;

  -- Get a random user/wallet for payer if needed
  SELECT user_id, id INTO v_user_id, v_wallet_id FROM public.wallets LIMIT 1;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'No wallet found in the database. Please run the base seed first.';
  END IF;


  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '2caefda9-623b-487d-9a5d-58c2351b29b2', v_merchant_id, 'PAY1782756688633-1-791', 'MORD-1782756688633-DEMO-0001', 1670000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #1', 'PENDING', 'acd1f962-3103-473b-aecf-a5e901170097', 
    now() - interval '29 days' - interval '14 hours' + interval '15 minutes', now() - interval '29 days' - interval '14 hours', now() - interval '29 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '6bbd811a-47fd-450b-bc11-890e29aceba6', 'PaymentOrder', '2caefda9-623b-487d-9a5d-58c2351b29b2', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"2caefda9-623b-487d-9a5d-58c2351b29b2","amount":1670000,"status":"PENDING"}'::jsonb, 'PENDING', now() - interval '29 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '9529e26b-e2f7-41c8-9107-83f67c5647de', v_merchant_id, 'PAY1782756688633-2-921', 'MORD-1782756688633-DEMO-0002', 880000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #2', 'PENDING', '0ac7dd94-3751-4e82-bae3-d0e92db5440c', 
    now() - interval '9 days' - interval '1 hours' + interval '15 minutes', now() - interval '9 days' - interval '1 hours', now() - interval '9 days' - interval '1 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'b1871131-f8ad-4811-b9d9-71d282bd3d66', 'PaymentOrder', '9529e26b-e2f7-41c8-9107-83f67c5647de', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"9529e26b-e2f7-41c8-9107-83f67c5647de","amount":880000,"status":"PENDING"}'::jsonb, 'PENDING', now() - interval '9 days' - interval '1 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'f8f98dcc-b05c-4dd9-b265-9861c7bb534e', v_merchant_id, 'PAY1782756688633-3-239', 'MORD-1782756688633-DEMO-0003', 1790000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #3', 'FAILED', '3c08b302-0218-4567-b517-1ac17b090f0e', 
    now() - interval '12 days' - interval '22 hours' + interval '15 minutes', now() - interval '12 days' - interval '22 hours', now() - interval '12 days' - interval '22 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '3a22e281-62b6-4c6e-b9f8-cf7f26f192e2', 'f8f98dcc-b05c-4dd9-b265-9861c7bb534e', v_user_id, v_wallet_id, 1790000, 'VND',
    '76e698b8-672c-40fb-a3ac-bd48f6d9e0f6', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '12 days' - interval '22 hours', now() - interval '12 days' - interval '22 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '551cf36b-9c9e-42bc-a8fe-57e394c86801', 'PaymentOrder', 'f8f98dcc-b05c-4dd9-b265-9861c7bb534e', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"f8f98dcc-b05c-4dd9-b265-9861c7bb534e","amount":1790000,"status":"FAILED"}'::jsonb, 'FAILED', now() - interval '12 days' - interval '22 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '589bbfa2-d730-426b-84f3-683e06ffdabc', v_merchant_id, 'PAY1782756688633-4-275', 'MORD-1782756688633-DEMO-0004', 1860000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #4', 'FAILED', 'ba0bca40-9e8e-49b6-8d5f-0f8a4f00a918', 
    now() - interval '2 days' - interval '6 hours' + interval '15 minutes', now() - interval '2 days' - interval '6 hours', now() - interval '2 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '2e64e299-488b-4b4e-96e1-6270fee03946', '589bbfa2-d730-426b-84f3-683e06ffdabc', v_user_id, v_wallet_id, 1860000, 'VND',
    'd25b69b3-3a36-449c-b14a-6cad998daa5c', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '2 days' - interval '6 hours', now() - interval '2 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '8ad0cbc6-b842-4dd4-912e-2adcb13641c1', 'PaymentOrder', '589bbfa2-d730-426b-84f3-683e06ffdabc', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"589bbfa2-d730-426b-84f3-683e06ffdabc","amount":1860000,"status":"FAILED"}'::jsonb, 'SUCCESS', now() - interval '2 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '6d56ba8f-8123-438a-baca-f8c1747e8971', v_merchant_id, 'PAY1782756688633-5-357', 'MORD-1782756688633-DEMO-0005', 880000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #5', 'SUCCESS', '4bbd0278-33da-4352-872a-37171b5b7137', 
    now() - interval '26 days' - interval '24 hours' + interval '15 minutes', now() - interval '26 days' - interval '24 hours', now() - interval '26 days' - interval '24 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '21e58d16-48f1-44f1-bedf-da7c16954baf', '6d56ba8f-8123-438a-baca-f8c1747e8971', v_user_id, v_wallet_id, 880000, 'VND',
    '9ecf8e7e-6b4e-4f43-bcad-c8946a470820', 'SUCCESS', NULL, 
    now() - interval '26 days' - interval '24 hours', now() - interval '26 days' - interval '24 hours', now() - interval '26 days' - interval '24 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'd8748f27-9039-4d45-8760-fb4291e047d6', 'PaymentOrder', '6d56ba8f-8123-438a-baca-f8c1747e8971', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"6d56ba8f-8123-438a-baca-f8c1747e8971","amount":880000,"status":"SUCCESS"}'::jsonb, 'SUCCESS', now() - interval '26 days' - interval '24 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    'bd770df4-037f-4937-b76c-151e5e7af1d1', 'LTX1782756688633-5-371', 'PAYMENT', 'COMPLETED', 880000, 'VND',
    'PAYMENT_ORDER', '6d56ba8f-8123-438a-baca-f8c1747e8971', 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0005', now() - interval '26 days' - interval '24 hours', now() - interval '26 days' - interval '24 hours', now() - interval '26 days' - interval '24 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '86203310-0d52-4db6-9d09-c70ed11d94ae', 'bd770df4-037f-4937-b76c-151e5e7af1d1', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    880000, 0, 880000, 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0005', now() - interval '26 days' - interval '24 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'b66760ee-b86b-4fbd-a5c1-064496d88450', v_merchant_id, 'PAY1782756688633-6-328', 'MORD-1782756688633-DEMO-0006', 810000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #6', 'FAILED', 'c4c5f94f-2a1e-4e27-894a-7020275dc7a3', 
    now() - interval '4 days' - interval '3 hours' + interval '15 minutes', now() - interval '4 days' - interval '3 hours', now() - interval '4 days' - interval '3 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '4e7539e0-ea15-4f95-817c-e0efed421385', 'b66760ee-b86b-4fbd-a5c1-064496d88450', v_user_id, v_wallet_id, 810000, 'VND',
    '1d74c3df-0ae0-4d23-8fe7-8e2e7e6cdf10', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '4 days' - interval '3 hours', now() - interval '4 days' - interval '3 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '1c4bf462-b318-4229-8d98-1db248dd134f', 'PaymentOrder', 'b66760ee-b86b-4fbd-a5c1-064496d88450', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"b66760ee-b86b-4fbd-a5c1-064496d88450","amount":810000,"status":"FAILED"}'::jsonb, 'SUCCESS', now() - interval '4 days' - interval '3 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'a1ce443e-3d51-4553-b8df-6f34e1e3a655', v_merchant_id, 'PAY1782756688633-7-759', 'MORD-1782756688633-DEMO-0007', 30000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #7', 'FAILED', 'c0cbb4f9-7dd2-417c-b5cb-9eb9e3ee7c82', 
    now() - interval '9 days' - interval '12 hours' + interval '15 minutes', now() - interval '9 days' - interval '12 hours', now() - interval '9 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    'fc6ba2e1-78ec-4f82-8278-3ac1e1896458', 'a1ce443e-3d51-4553-b8df-6f34e1e3a655', v_user_id, v_wallet_id, 30000, 'VND',
    '0b9e4754-9f0e-473f-928c-2331d4b550e7', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '9 days' - interval '12 hours', now() - interval '9 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'd9795ba0-e2a8-473c-be70-aadf473db6e9', 'PaymentOrder', 'a1ce443e-3d51-4553-b8df-6f34e1e3a655', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"a1ce443e-3d51-4553-b8df-6f34e1e3a655","amount":30000,"status":"FAILED"}'::jsonb, 'FAILED', now() - interval '9 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '335b4593-64a9-4865-83b4-44937c2637ab', v_merchant_id, 'PAY1782756688633-8-631', 'MORD-1782756688633-DEMO-0008', 300000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #8', 'PENDING', '406bbb83-13f0-4fe3-945c-373ad1af2978', 
    now() - interval '8 days' - interval '10 hours' + interval '15 minutes', now() - interval '8 days' - interval '10 hours', now() - interval '8 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'ef802b14-7f10-4c1b-9665-2e8594b1bf0d', 'PaymentOrder', '335b4593-64a9-4865-83b4-44937c2637ab', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"335b4593-64a9-4865-83b4-44937c2637ab","amount":300000,"status":"PENDING"}'::jsonb, 'FAILED', now() - interval '8 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'd8ab0edb-61e5-4d56-8de9-c16fa46f6356', v_merchant_id, 'PAY1782756688633-9-726', 'MORD-1782756688633-DEMO-0009', 540000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #9', 'SUCCESS', '8f58162b-89ef-4e45-9090-37063232d62c', 
    now() - interval '3 days' - interval '10 hours' + interval '15 minutes', now() - interval '3 days' - interval '10 hours', now() - interval '3 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '85cbd1f4-7044-4227-a76a-0d4027259527', 'd8ab0edb-61e5-4d56-8de9-c16fa46f6356', v_user_id, v_wallet_id, 540000, 'VND',
    '45258419-d09a-475c-a83c-a0037022d3da', 'SUCCESS', NULL, 
    now() - interval '3 days' - interval '10 hours', now() - interval '3 days' - interval '10 hours', now() - interval '3 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '662cb96b-9af2-4006-b5bd-5940e69ff9f8', 'PaymentOrder', 'd8ab0edb-61e5-4d56-8de9-c16fa46f6356', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"d8ab0edb-61e5-4d56-8de9-c16fa46f6356","amount":540000,"status":"SUCCESS"}'::jsonb, 'PENDING', now() - interval '3 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    'e9c09c77-5d88-48ee-8886-47113657b10e', 'LTX1782756688633-9-999', 'PAYMENT', 'COMPLETED', 540000, 'VND',
    'PAYMENT_ORDER', 'd8ab0edb-61e5-4d56-8de9-c16fa46f6356', 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0009', now() - interval '3 days' - interval '10 hours', now() - interval '3 days' - interval '10 hours', now() - interval '3 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '8a2e75ed-1ed0-42b2-ac49-eaa63c8d39ae', 'e9c09c77-5d88-48ee-8886-47113657b10e', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    540000, 0, 540000, 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0009', now() - interval '3 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'f691e094-0037-4d50-a3b7-e2db668f1aa0', v_merchant_id, 'PAY1782756688633-10-919', 'MORD-1782756688633-DEMO-0010', 2000000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #10', 'SUCCESS', '6ef898f3-2148-488e-bc0b-4ce85000e844', 
    now() - interval '30 days' - interval '12 hours' + interval '15 minutes', now() - interval '30 days' - interval '12 hours', now() - interval '30 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '3177ad8a-1720-430e-9e98-1b94b9bb4b83', 'f691e094-0037-4d50-a3b7-e2db668f1aa0', v_user_id, v_wallet_id, 2000000, 'VND',
    '84e82310-9553-41be-a95b-bdb133691077', 'SUCCESS', NULL, 
    now() - interval '30 days' - interval '12 hours', now() - interval '30 days' - interval '12 hours', now() - interval '30 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '279823dc-7b75-4135-88ba-b550d4a14ef6', 'PaymentOrder', 'f691e094-0037-4d50-a3b7-e2db668f1aa0', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"f691e094-0037-4d50-a3b7-e2db668f1aa0","amount":2000000,"status":"SUCCESS"}'::jsonb, 'SUCCESS', now() - interval '30 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    '186e2624-4eb9-403f-ac2e-bdefb0ccd5bf', 'LTX1782756688633-10-715', 'PAYMENT', 'COMPLETED', 2000000, 'VND',
    'PAYMENT_ORDER', 'f691e094-0037-4d50-a3b7-e2db668f1aa0', 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0010', now() - interval '30 days' - interval '12 hours', now() - interval '30 days' - interval '12 hours', now() - interval '30 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '3aa8069c-80e2-4adc-bd17-dd2afedd9eac', '186e2624-4eb9-403f-ac2e-bdefb0ccd5bf', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    2000000, 0, 2000000, 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0010', now() - interval '30 days' - interval '12 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '0a7d3e5f-6f9c-45d4-a7f7-81858a0b939b', v_merchant_id, 'PAY1782756688633-11-834', 'MORD-1782756688633-DEMO-0011', 1550000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #11', 'PENDING', '9e5599e8-3629-481b-91cf-2f35527c539f', 
    now() - interval '7 days' - interval '17 hours' + interval '15 minutes', now() - interval '7 days' - interval '17 hours', now() - interval '7 days' - interval '17 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '0185ac0d-d0b7-4446-b806-003ed715a5e6', 'PaymentOrder', '0a7d3e5f-6f9c-45d4-a7f7-81858a0b939b', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"0a7d3e5f-6f9c-45d4-a7f7-81858a0b939b","amount":1550000,"status":"PENDING"}'::jsonb, 'SUCCESS', now() - interval '7 days' - interval '17 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '34969e6f-f72b-48ae-b54d-9380181c5491', v_merchant_id, 'PAY1782756688633-12-623', 'MORD-1782756688633-DEMO-0012', 1160000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #12', 'CANCELED', '1ac18a64-b0c8-49bb-a27b-a74974fa575c', 
    now() - interval '15 days' - interval '16 hours' + interval '15 minutes', now() - interval '15 days' - interval '16 hours', now() - interval '15 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '9da30784-5db3-4d60-9ad3-d4eb57bdb85f', 'PaymentOrder', '34969e6f-f72b-48ae-b54d-9380181c5491', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"34969e6f-f72b-48ae-b54d-9380181c5491","amount":1160000,"status":"CANCELED"}'::jsonb, 'FAILED', now() - interval '15 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '9de007d7-645b-4f01-b24c-f67565d3020f', v_merchant_id, 'PAY1782756688633-13-877', 'MORD-1782756688633-DEMO-0013', 1330000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #13', 'SUCCESS', 'e3ed2409-a9d2-497c-a32f-6fe8fb009c0f', 
    now() - interval '28 days' - interval '5 hours' + interval '15 minutes', now() - interval '28 days' - interval '5 hours', now() - interval '28 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    'd81cd66b-ea05-46fd-8335-9a149c34bc1a', '9de007d7-645b-4f01-b24c-f67565d3020f', v_user_id, v_wallet_id, 1330000, 'VND',
    '4e410974-9496-490c-9520-c0236cbdca74', 'SUCCESS', NULL, 
    now() - interval '28 days' - interval '5 hours', now() - interval '28 days' - interval '5 hours', now() - interval '28 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '8bb79346-a284-448c-b652-1d152b97b90c', 'PaymentOrder', '9de007d7-645b-4f01-b24c-f67565d3020f', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"9de007d7-645b-4f01-b24c-f67565d3020f","amount":1330000,"status":"SUCCESS"}'::jsonb, 'SUCCESS', now() - interval '28 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    'dd921786-7d13-4c38-9cd6-0b3b28cd6ea6', 'LTX1782756688634-13-704', 'PAYMENT', 'COMPLETED', 1330000, 'VND',
    'PAYMENT_ORDER', '9de007d7-645b-4f01-b24c-f67565d3020f', 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0013', now() - interval '28 days' - interval '5 hours', now() - interval '28 days' - interval '5 hours', now() - interval '28 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    'ae4ced45-25ae-450f-9519-88c2ce59d45f', 'dd921786-7d13-4c38-9cd6-0b3b28cd6ea6', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    1330000, 0, 1330000, 'Thanh toán đơn hàng MORD-1782756688633-DEMO-0013', now() - interval '28 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'ea758d06-d816-4e42-956d-9299cf556f27', v_merchant_id, 'PAY1782756688634-14-474', 'MORD-1782756688634-DEMO-0014', 600000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #14', 'SUCCESS', '8aa8ae38-717e-478e-b539-3607f2c25939', 
    now() - interval '24 days' - interval '5 hours' + interval '15 minutes', now() - interval '24 days' - interval '5 hours', now() - interval '24 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '95db3e3c-421f-4b36-946f-480aa2940073', 'ea758d06-d816-4e42-956d-9299cf556f27', v_user_id, v_wallet_id, 600000, 'VND',
    '3aca3584-dc59-430a-90a6-529275ea357d', 'SUCCESS', NULL, 
    now() - interval '24 days' - interval '5 hours', now() - interval '24 days' - interval '5 hours', now() - interval '24 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '7318ad81-bc13-4eb7-8ffb-804ac544b203', 'PaymentOrder', 'ea758d06-d816-4e42-956d-9299cf556f27', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"ea758d06-d816-4e42-956d-9299cf556f27","amount":600000,"status":"SUCCESS"}'::jsonb, 'FAILED', now() - interval '24 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    '4da1b5c8-38f0-42d5-b037-798ac884ddb5', 'LTX1782756688634-14-539', 'PAYMENT', 'COMPLETED', 600000, 'VND',
    'PAYMENT_ORDER', 'ea758d06-d816-4e42-956d-9299cf556f27', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0014', now() - interval '24 days' - interval '5 hours', now() - interval '24 days' - interval '5 hours', now() - interval '24 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '97a11697-a242-42c2-bda5-f0d101167f8a', '4da1b5c8-38f0-42d5-b037-798ac884ddb5', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    600000, 0, 600000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0014', now() - interval '24 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '9ac063b8-fbce-40b1-9393-eee0eb6d1882', v_merchant_id, 'PAY1782756688634-15-423', 'MORD-1782756688634-DEMO-0015', 960000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #15', 'SUCCESS', '23b012b2-bcfe-4430-9b85-b17999d71182', 
    now() - interval '13 days' - interval '6 hours' + interval '15 minutes', now() - interval '13 days' - interval '6 hours', now() - interval '13 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '488047ea-73b8-48fd-a463-61944ee496df', '9ac063b8-fbce-40b1-9393-eee0eb6d1882', v_user_id, v_wallet_id, 960000, 'VND',
    '63535387-57d7-4c48-8e74-1de3db89b064', 'SUCCESS', NULL, 
    now() - interval '13 days' - interval '6 hours', now() - interval '13 days' - interval '6 hours', now() - interval '13 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '164a5d0a-c559-48dc-9871-ef0d1b5ccb04', 'PaymentOrder', '9ac063b8-fbce-40b1-9393-eee0eb6d1882', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"9ac063b8-fbce-40b1-9393-eee0eb6d1882","amount":960000,"status":"SUCCESS"}'::jsonb, 'FAILED', now() - interval '13 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    '77bc1d42-cb1a-4ee0-a7f4-59cf7cb4e4fe', 'LTX1782756688634-15-890', 'PAYMENT', 'COMPLETED', 960000, 'VND',
    'PAYMENT_ORDER', '9ac063b8-fbce-40b1-9393-eee0eb6d1882', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0015', now() - interval '13 days' - interval '6 hours', now() - interval '13 days' - interval '6 hours', now() - interval '13 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    'baf5bdf2-f1c9-42fa-9406-a64474b1c8d8', '77bc1d42-cb1a-4ee0-a7f4-59cf7cb4e4fe', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    960000, 0, 960000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0015', now() - interval '13 days' - interval '6 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'c47faed4-95ab-481a-9875-ff4d7ba0f671', v_merchant_id, 'PAY1782756688634-16-839', 'MORD-1782756688634-DEMO-0016', 1840000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #16', 'SUCCESS', 'bdc8fa82-2585-48d1-a660-21ea613018a4', 
    now() - interval '11 days' - interval '15 hours' + interval '15 minutes', now() - interval '11 days' - interval '15 hours', now() - interval '11 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    'd2cb037e-bd8a-4fa5-a2bb-6a381f9a9042', 'c47faed4-95ab-481a-9875-ff4d7ba0f671', v_user_id, v_wallet_id, 1840000, 'VND',
    '5c13b42d-93f6-4edb-a6b0-37db5a8dcc09', 'SUCCESS', NULL, 
    now() - interval '11 days' - interval '15 hours', now() - interval '11 days' - interval '15 hours', now() - interval '11 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'cb7d017d-7674-4c55-a759-2895e823ed37', 'PaymentOrder', 'c47faed4-95ab-481a-9875-ff4d7ba0f671', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"c47faed4-95ab-481a-9875-ff4d7ba0f671","amount":1840000,"status":"SUCCESS"}'::jsonb, 'PENDING', now() - interval '11 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    'cc979c36-b570-4d48-9313-37f711adfa34', 'LTX1782756688634-16-121', 'PAYMENT', 'COMPLETED', 1840000, 'VND',
    'PAYMENT_ORDER', 'c47faed4-95ab-481a-9875-ff4d7ba0f671', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0016', now() - interval '11 days' - interval '15 hours', now() - interval '11 days' - interval '15 hours', now() - interval '11 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '089219b3-91cd-4538-b9a3-97857dc22ee3', 'cc979c36-b570-4d48-9313-37f711adfa34', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    1840000, 0, 1840000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0016', now() - interval '11 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '79df47c1-af9b-430d-95a6-f0a7cacebe56', v_merchant_id, 'PAY1782756688634-17-158', 'MORD-1782756688634-DEMO-0017', 690000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #17', 'SUCCESS', '2e325382-da5a-46b1-bbe8-7d5c1798dadf', 
    now() - interval '10 days' - interval '13 hours' + interval '15 minutes', now() - interval '10 days' - interval '13 hours', now() - interval '10 days' - interval '13 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    'f6cc4e09-15e1-496a-87f3-571201edbf5c', '79df47c1-af9b-430d-95a6-f0a7cacebe56', v_user_id, v_wallet_id, 690000, 'VND',
    '597591af-c854-4cbe-82a5-d8383431ac25', 'SUCCESS', NULL, 
    now() - interval '10 days' - interval '13 hours', now() - interval '10 days' - interval '13 hours', now() - interval '10 days' - interval '13 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'ee9074ca-cd5f-4715-af55-4c677a4d2b74', 'PaymentOrder', '79df47c1-af9b-430d-95a6-f0a7cacebe56', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"79df47c1-af9b-430d-95a6-f0a7cacebe56","amount":690000,"status":"SUCCESS"}'::jsonb, 'SUCCESS', now() - interval '10 days' - interval '13 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    '273c93db-dcb6-4306-b3d7-c599a8d4e14f', 'LTX1782756688634-17-534', 'PAYMENT', 'COMPLETED', 690000, 'VND',
    'PAYMENT_ORDER', '79df47c1-af9b-430d-95a6-f0a7cacebe56', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0017', now() - interval '10 days' - interval '13 hours', now() - interval '10 days' - interval '13 hours', now() - interval '10 days' - interval '13 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '240f3d89-454d-479d-bc36-bb30fefb9b46', '273c93db-dcb6-4306-b3d7-c599a8d4e14f', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    690000, 0, 690000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0017', now() - interval '10 days' - interval '13 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'c6e4b28d-5f0e-4a06-8b9d-a4d68c02bb24', v_merchant_id, 'PAY1782756688634-18-803', 'MORD-1782756688634-DEMO-0018', 790000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #18', 'CANCELED', '1d789222-85c8-4c02-9883-77166cad5ed5', 
    now() - interval '2 days' - interval '10 hours' + interval '15 minutes', now() - interval '2 days' - interval '10 hours', now() - interval '2 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '58e91b1c-ada3-4403-ba30-c66c53235916', 'PaymentOrder', 'c6e4b28d-5f0e-4a06-8b9d-a4d68c02bb24', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"c6e4b28d-5f0e-4a06-8b9d-a4d68c02bb24","amount":790000,"status":"CANCELED"}'::jsonb, 'FAILED', now() - interval '2 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '5ec8fda5-901a-42ae-a740-b5cf0d30571e', v_merchant_id, 'PAY1782756688634-19-939', 'MORD-1782756688634-DEMO-0019', 1200000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #19', 'SUCCESS', 'ca28fc1d-ee43-4dc8-a5a4-8db2ba4450b1', 
    now() - interval '16 days' - interval '23 hours' + interval '15 minutes', now() - interval '16 days' - interval '23 hours', now() - interval '16 days' - interval '23 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '1a2664ec-196c-490f-ab50-248ae786471e', '5ec8fda5-901a-42ae-a740-b5cf0d30571e', v_user_id, v_wallet_id, 1200000, 'VND',
    '7bef8304-aa07-45c8-9f2f-6da7e11526f5', 'SUCCESS', NULL, 
    now() - interval '16 days' - interval '23 hours', now() - interval '16 days' - interval '23 hours', now() - interval '16 days' - interval '23 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '2eace055-77fb-4a21-95cb-b74cb41bd73d', 'PaymentOrder', '5ec8fda5-901a-42ae-a740-b5cf0d30571e', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"5ec8fda5-901a-42ae-a740-b5cf0d30571e","amount":1200000,"status":"SUCCESS"}'::jsonb, 'PENDING', now() - interval '16 days' - interval '23 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    '206c5f48-565b-4380-9606-ec1fdfcf45d2', 'LTX1782756688634-19-611', 'PAYMENT', 'COMPLETED', 1200000, 'VND',
    'PAYMENT_ORDER', '5ec8fda5-901a-42ae-a740-b5cf0d30571e', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0019', now() - interval '16 days' - interval '23 hours', now() - interval '16 days' - interval '23 hours', now() - interval '16 days' - interval '23 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    'fb4e3a61-0a5e-499a-9a92-e75ce37f9333', '206c5f48-565b-4380-9606-ec1fdfcf45d2', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    1200000, 0, 1200000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0019', now() - interval '16 days' - interval '23 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'ace7f75f-2218-4137-aa36-53faf896dffa', v_merchant_id, 'PAY1782756688634-20-756', 'MORD-1782756688634-DEMO-0020', 920000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #20', 'PENDING', '6e0f6319-6547-4eaf-b31d-b8ebe78afbba', 
    now() - interval '15 days' - interval '7 hours' + interval '15 minutes', now() - interval '15 days' - interval '7 hours', now() - interval '15 days' - interval '7 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '53313212-c343-4522-8db4-8def5773201d', 'PaymentOrder', 'ace7f75f-2218-4137-aa36-53faf896dffa', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"ace7f75f-2218-4137-aa36-53faf896dffa","amount":920000,"status":"PENDING"}'::jsonb, 'PENDING', now() - interval '15 days' - interval '7 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'b3261ab2-f295-47f3-94e7-63f5bba36934', v_merchant_id, 'PAY1782756688634-21-871', 'MORD-1782756688634-DEMO-0021', 20000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #21', 'PENDING', 'c1d76684-fabb-4227-8a2b-100d9d67f22d', 
    now() - interval '5 days' - interval '14 hours' + interval '15 minutes', now() - interval '5 days' - interval '14 hours', now() - interval '5 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '8408ad64-139e-42a5-9c38-877a36701d04', 'PaymentOrder', 'b3261ab2-f295-47f3-94e7-63f5bba36934', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"b3261ab2-f295-47f3-94e7-63f5bba36934","amount":20000,"status":"PENDING"}'::jsonb, 'SUCCESS', now() - interval '5 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '47d376b7-b2dd-4f00-896b-748b06c06bf2', v_merchant_id, 'PAY1782756688634-22-961', 'MORD-1782756688634-DEMO-0022', 1890000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #22', 'FAILED', 'f22d55ff-8a53-4166-893f-784b42d24c1c', 
    now() - interval '2 days' - interval '14 hours' + interval '15 minutes', now() - interval '2 days' - interval '14 hours', now() - interval '2 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '0bdeca27-6585-40f2-8886-b0831cde91fb', '47d376b7-b2dd-4f00-896b-748b06c06bf2', v_user_id, v_wallet_id, 1890000, 'VND',
    'e1706044-06fa-4143-9e2c-6c103c85b82b', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '2 days' - interval '14 hours', now() - interval '2 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '158588c3-5340-41fa-be78-45a16c16d13a', 'PaymentOrder', '47d376b7-b2dd-4f00-896b-748b06c06bf2', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"47d376b7-b2dd-4f00-896b-748b06c06bf2","amount":1890000,"status":"FAILED"}'::jsonb, 'SUCCESS', now() - interval '2 days' - interval '14 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '2fed3c26-19a2-4ef9-843b-2bb187dc9519', v_merchant_id, 'PAY1782756688634-23-331', 'MORD-1782756688634-DEMO-0023', 1480000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #23', 'FAILED', 'aeb76833-23cd-4a68-9ed2-f48d21092773', 
    now() - interval '30 days' - interval '3 hours' + interval '15 minutes', now() - interval '30 days' - interval '3 hours', now() - interval '30 days' - interval '3 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    'eb469d15-6ead-48eb-aff8-9fc3a2c90db9', '2fed3c26-19a2-4ef9-843b-2bb187dc9519', v_user_id, v_wallet_id, 1480000, 'VND',
    'a2a922fb-4ef7-4780-ab42-851893983c6c', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '30 days' - interval '3 hours', now() - interval '30 days' - interval '3 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '1789a903-fa91-44ef-9f4f-ac386c7832a3', 'PaymentOrder', '2fed3c26-19a2-4ef9-843b-2bb187dc9519', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"2fed3c26-19a2-4ef9-843b-2bb187dc9519","amount":1480000,"status":"FAILED"}'::jsonb, 'PENDING', now() - interval '30 days' - interval '3 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '0434189b-647d-4db5-b5c2-5fc3cc5c393b', v_merchant_id, 'PAY1782756688634-24-166', 'MORD-1782756688634-DEMO-0024', 1890000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #24', 'PENDING', '74acf5fa-b538-4868-97ee-ccbc3ea48446', 
    now() - interval '3 days' - interval '9 hours' + interval '15 minutes', now() - interval '3 days' - interval '9 hours', now() - interval '3 days' - interval '9 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'b899db52-16ce-4aea-b71d-af244687015e', 'PaymentOrder', '0434189b-647d-4db5-b5c2-5fc3cc5c393b', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"0434189b-647d-4db5-b5c2-5fc3cc5c393b","amount":1890000,"status":"PENDING"}'::jsonb, 'SUCCESS', now() - interval '3 days' - interval '9 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '87c99378-4810-4e1c-a42d-5d39f7387bce', v_merchant_id, 'PAY1782756688634-25-852', 'MORD-1782756688634-DEMO-0025', 730000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #25', 'CANCELED', '5ff635c8-f593-44a4-97a8-58a6cf636808', 
    now() - interval '27 days' - interval '17 hours' + interval '15 minutes', now() - interval '27 days' - interval '17 hours', now() - interval '27 days' - interval '17 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'ac1610e6-6004-4013-b99c-fea9427abaa8', 'PaymentOrder', '87c99378-4810-4e1c-a42d-5d39f7387bce', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"87c99378-4810-4e1c-a42d-5d39f7387bce","amount":730000,"status":"CANCELED"}'::jsonb, 'SUCCESS', now() - interval '27 days' - interval '17 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '27a60ce7-8393-42d3-8198-8ace007553b6', v_merchant_id, 'PAY1782756688634-26-527', 'MORD-1782756688634-DEMO-0026', 240000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #26', 'PENDING', 'eec1b388-bd02-4f5b-8780-ae9d43aa7207', 
    now() - interval '24 days' - interval '16 hours' + interval '15 minutes', now() - interval '24 days' - interval '16 hours', now() - interval '24 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '1465b896-e6d3-4dd9-b2d8-63c62ee3f927', 'PaymentOrder', '27a60ce7-8393-42d3-8198-8ace007553b6', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"27a60ce7-8393-42d3-8198-8ace007553b6","amount":240000,"status":"PENDING"}'::jsonb, 'SUCCESS', now() - interval '24 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '8ca75fe3-ea75-43b4-97cd-871ebfc2509c', v_merchant_id, 'PAY1782756688634-27-149', 'MORD-1782756688634-DEMO-0027', 1710000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #27', 'PENDING', '58699c9e-1d8a-41ae-a8f6-4448a04aff4b', 
    now() - interval '9 days' - interval '4 hours' + interval '15 minutes', now() - interval '9 days' - interval '4 hours', now() - interval '9 days' - interval '4 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'c5c419dc-bc33-4c33-a0df-7e5a914d6b11', 'PaymentOrder', '8ca75fe3-ea75-43b4-97cd-871ebfc2509c', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"8ca75fe3-ea75-43b4-97cd-871ebfc2509c","amount":1710000,"status":"PENDING"}'::jsonb, 'FAILED', now() - interval '9 days' - interval '4 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '186a8763-78c7-48f9-81b0-927ea3dfb2c0', v_merchant_id, 'PAY1782756688634-28-421', 'MORD-1782756688634-DEMO-0028', 180000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #28', 'PENDING', 'd8ca6254-7f9f-458b-bf51-2195183e2384', 
    now() - interval '13 days' - interval '17 hours' + interval '15 minutes', now() - interval '13 days' - interval '17 hours', now() - interval '13 days' - interval '17 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'd9c0bb76-daf4-4a81-a97d-2b942baaaead', 'PaymentOrder', '186a8763-78c7-48f9-81b0-927ea3dfb2c0', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"186a8763-78c7-48f9-81b0-927ea3dfb2c0","amount":180000,"status":"PENDING"}'::jsonb, 'PENDING', now() - interval '13 days' - interval '17 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '3742fc41-57f6-4a36-a6c1-22f861656a0b', v_merchant_id, 'PAY1782756688634-29-638', 'MORD-1782756688634-DEMO-0029', 230000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #29', 'PENDING', '02be4bbf-505d-4061-9c6e-3c6f1dff87a4', 
    now() - interval '24 days' - interval '10 hours' + interval '15 minutes', now() - interval '24 days' - interval '10 hours', now() - interval '24 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '6030f78a-9029-4d29-97c7-c342d16a162d', 'PaymentOrder', '3742fc41-57f6-4a36-a6c1-22f861656a0b', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"3742fc41-57f6-4a36-a6c1-22f861656a0b","amount":230000,"status":"PENDING"}'::jsonb, 'FAILED', now() - interval '24 days' - interval '10 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '5b4ea767-9446-4305-b62a-7aa8125252dc', v_merchant_id, 'PAY1782756688634-30-369', 'MORD-1782756688634-DEMO-0030', 730000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #30', 'SUCCESS', '84fa316f-d1e2-4108-ba75-36b7f51567ff', 
    now() - interval '20 days' - interval '16 hours' + interval '15 minutes', now() - interval '20 days' - interval '16 hours', now() - interval '20 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '67b01788-5786-4980-83c5-59b6bac19e90', '5b4ea767-9446-4305-b62a-7aa8125252dc', v_user_id, v_wallet_id, 730000, 'VND',
    'e21d6309-12cb-426f-92fa-08e430bf4e05', 'SUCCESS', NULL, 
    now() - interval '20 days' - interval '16 hours', now() - interval '20 days' - interval '16 hours', now() - interval '20 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '09410590-3dd4-4a0a-8b08-a70371d4aac9', 'PaymentOrder', '5b4ea767-9446-4305-b62a-7aa8125252dc', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"5b4ea767-9446-4305-b62a-7aa8125252dc","amount":730000,"status":"SUCCESS"}'::jsonb, 'SUCCESS', now() - interval '20 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    'd65d5ea3-a841-4bed-812c-2e79e7cefef2', 'LTX1782756688634-30-597', 'PAYMENT', 'COMPLETED', 730000, 'VND',
    'PAYMENT_ORDER', '5b4ea767-9446-4305-b62a-7aa8125252dc', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0030', now() - interval '20 days' - interval '16 hours', now() - interval '20 days' - interval '16 hours', now() - interval '20 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    'ce4b507d-9501-4586-b4fa-c963f5222a2c', 'd65d5ea3-a841-4bed-812c-2e79e7cefef2', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    730000, 0, 730000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0030', now() - interval '20 days' - interval '16 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '7854d2f0-97eb-470a-96a1-17460a0fe0d4', v_merchant_id, 'PAY1782756688634-31-141', 'MORD-1782756688634-DEMO-0031', 310000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #31', 'PENDING', '7004c3b7-f47f-4e2e-8b5d-a26b62c6ae78', 
    now() - interval '3 days' - interval '19 hours' + interval '15 minutes', now() - interval '3 days' - interval '19 hours', now() - interval '3 days' - interval '19 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'af255334-5dc7-4600-9ebb-5b9f2d726794', 'PaymentOrder', '7854d2f0-97eb-470a-96a1-17460a0fe0d4', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"7854d2f0-97eb-470a-96a1-17460a0fe0d4","amount":310000,"status":"PENDING"}'::jsonb, 'FAILED', now() - interval '3 days' - interval '19 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '90b5156f-1ba2-4322-b6e8-6183bd550562', v_merchant_id, 'PAY1782756688634-32-698', 'MORD-1782756688634-DEMO-0032', 880000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #32', 'SUCCESS', 'b1643607-567e-4f0a-b363-8de778ee1cdc', 
    now() - interval '4 days' - interval '11 hours' + interval '15 minutes', now() - interval '4 days' - interval '11 hours', now() - interval '4 days' - interval '11 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '85868e9e-6122-4462-9a39-20bfebd33ad8', '90b5156f-1ba2-4322-b6e8-6183bd550562', v_user_id, v_wallet_id, 880000, 'VND',
    'deae8459-db20-4279-acbf-336cc0970ecb', 'SUCCESS', NULL, 
    now() - interval '4 days' - interval '11 hours', now() - interval '4 days' - interval '11 hours', now() - interval '4 days' - interval '11 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'd6ea8549-1074-40ed-a297-701d196986a0', 'PaymentOrder', '90b5156f-1ba2-4322-b6e8-6183bd550562', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"90b5156f-1ba2-4322-b6e8-6183bd550562","amount":880000,"status":"SUCCESS"}'::jsonb, 'SUCCESS', now() - interval '4 days' - interval '11 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency,
    source_type, source_id, description, completed_at, created_at, updated_at
  ) VALUES (
    'd675f7dd-fa2a-4072-a857-e37adacfd5ba', 'LTX1782756688634-32-664', 'PAYMENT', 'COMPLETED', 880000, 'VND',
    'PAYMENT_ORDER', '90b5156f-1ba2-4322-b6e8-6183bd550562', 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0032', now() - interval '4 days' - interval '11 hours', now() - interval '4 days' - interval '11 hours', now() - interval '4 days' - interval '11 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type,
    amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '7cecb3ef-4204-4a82-a23d-66c6e52f1894', 'd675f7dd-fa2a-4072-a857-e37adacfd5ba', 'MERCHANT_BALANCE', v_merchant_id, 'CREDIT',
    880000, 0, 880000, 'Thanh toán đơn hàng MORD-1782756688634-DEMO-0032', now() - interval '4 days' - interval '11 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '629bfae0-cef1-4e09-9f6b-10ec66d1d1a5', v_merchant_id, 'PAY1782756688634-33-731', 'MORD-1782756688634-DEMO-0033', 1100000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #33', 'FAILED', '6baa3a00-97b6-4c45-9b94-2ff9d2dba697', 
    now() - interval '5 days' - interval '15 hours' + interval '15 minutes', now() - interval '5 days' - interval '15 hours', now() - interval '5 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_transactions (
    id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency,
    idempotency_key, status, failure_reason, paid_at, created_at, updated_at
  ) VALUES (
    '7f0e1724-5466-4157-ad8c-0d3ff7c43373', '629bfae0-cef1-4e09-9f6b-10ec66d1d1a5', v_user_id, v_wallet_id, 1100000, 'VND',
    'e74e524f-a0bb-4aaf-be93-0f031e4f67cc', 'FAILED', 'Số dư không đủ', 
    NULL, now() - interval '5 days' - interval '15 hours', now() - interval '5 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '99aeb293-a153-44bf-97cf-6bdfa0f997c3', 'PaymentOrder', '629bfae0-cef1-4e09-9f6b-10ec66d1d1a5', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"629bfae0-cef1-4e09-9f6b-10ec66d1d1a5","amount":1100000,"status":"FAILED"}'::jsonb, 'SUCCESS', now() - interval '5 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    '4258f26f-750d-4fb5-adbb-55dc60ae5cbb', v_merchant_id, 'PAY1782756688634-34-774', 'MORD-1782756688634-DEMO-0034', 150000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #34', 'PENDING', '87b0f294-5317-4f04-abb9-49ec90cfa0bd', 
    now() - interval '8 days' - interval '5 hours' + interval '15 minutes', now() - interval '8 days' - interval '5 hours', now() - interval '8 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    '520bf8a9-61a9-4233-a523-5600a2a0239a', 'PaymentOrder', '4258f26f-750d-4fb5-adbb-55dc60ae5cbb', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"4258f26f-750d-4fb5-adbb-55dc60ae5cbb","amount":150000,"status":"PENDING"}'::jsonb, 'PENDING', now() - interval '8 days' - interval '5 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.payment_orders (
    id, merchant_id, payment_no, merchant_order_id, amount, currency, 
    callback_url, description, status, idempotency_key, expired_at, created_at, updated_at
  ) VALUES (
    'c3397778-6cf8-4e50-9d58-2458fc4a2106', v_merchant_id, 'PAY1782756688634-35-469', 'MORD-1782756688634-DEMO-0035', 1570000, 'VND',
    'https://merchant.example.com/callback', 'Đơn hàng demo #35', 'PENDING', 'b327550c-6f91-406f-950b-8e95211cb152', 
    now() - interval '18 days' - interval '15 hours' + interval '15 minutes', now() - interval '18 days' - interval '15 hours', now() - interval '18 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.outbox_events (
    id, aggregate_type, aggregate_id, event_type, payload, status, created_at
  ) VALUES (
    'e3940bd3-cfde-4b46-ab80-ba1b59ed0ee1', 'PaymentOrder', 'c3397778-6cf8-4e50-9d58-2458fc4a2106', 'PAYMENT_ORDER_COMPLETED', '{"event_type":"PAYMENT_ORDER_COMPLETED","payment_order_id":"c3397778-6cf8-4e50-9d58-2458fc4a2106","amount":1570000,"status":"PENDING"}'::jsonb, 'PENDING', now() - interval '18 days' - interval '15 hours'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency, description, completed_at, created_at, updated_at
  ) VALUES (
    '8fd7248b-354e-49aa-86f1-9f47672fa3ef', 'LTX-FEE-1782756688634-1', 'FEE', 'COMPLETED', 150000, 'VND', 'Phí dịch vụ demo', now() - interval '21 days', now() - interval '21 days', now() - interval '21 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type, amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '8ef9d115-3224-4059-a31b-288dd348f771', '8fd7248b-354e-49aa-86f1-9f47672fa3ef', 'MERCHANT_BALANCE', v_merchant_id, 'DEBIT', 150000, 0, 0, 'Phí dịch vụ demo', now() - interval '21 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency, description, completed_at, created_at, updated_at
  ) VALUES (
    '88de7040-7555-4d2f-bb13-b93b642a89af', 'LTX-FEE-1782756688634-2', 'FEE', 'COMPLETED', 120000, 'VND', 'Phí dịch vụ demo', now() - interval '1 days', now() - interval '1 days', now() - interval '1 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type, amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '6b112b42-2ae6-4e6e-8098-550a35e0d8ff', '88de7040-7555-4d2f-bb13-b93b642a89af', 'MERCHANT_BALANCE', v_merchant_id, 'DEBIT', 120000, 0, 0, 'Phí dịch vụ demo', now() - interval '1 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency, description, completed_at, created_at, updated_at
  ) VALUES (
    '6a19e209-fbe6-4ef1-b159-78fef632ce7a', 'LTX-FEE-1782756688634-3', 'FEE', 'COMPLETED', 120000, 'VND', 'Phí dịch vụ demo', now() - interval '5 days', now() - interval '5 days', now() - interval '5 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type, amount, balance_before, balance_after, description, created_at
  ) VALUES (
    'b502e947-4dd0-411f-8f30-fd6fc12a888e', '6a19e209-fbe6-4ef1-b159-78fef632ce7a', 'MERCHANT_BALANCE', v_merchant_id, 'DEBIT', 120000, 0, 0, 'Phí dịch vụ demo', now() - interval '5 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency, description, completed_at, created_at, updated_at
  ) VALUES (
    '04c01cd2-1252-4218-b183-7914c22bf47b', 'LTX-FEE-1782756688634-4', 'FEE', 'COMPLETED', 140000, 'VND', 'Phí dịch vụ demo', now() - interval '27 days', now() - interval '27 days', now() - interval '27 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type, amount, balance_before, balance_after, description, created_at
  ) VALUES (
    '655300d3-8eea-43ba-bd86-18c85d33f2ca', '04c01cd2-1252-4218-b183-7914c22bf47b', 'MERCHANT_BALANCE', v_merchant_id, 'DEBIT', 140000, 0, 0, 'Phí dịch vụ demo', now() - interval '27 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_transactions (
    id, transaction_no, transaction_type, status, amount, currency, description, completed_at, created_at, updated_at
  ) VALUES (
    '321084c3-e7a3-4b9e-8d3b-7bff323ceb5d', 'LTX-FEE-1782756688634-5', 'FEE', 'COMPLETED', 150000, 'VND', 'Phí dịch vụ demo', now() - interval '6 days', now() - interval '6 days', now() - interval '6 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.ledger_entries (
    id, ledger_transaction_id, account_type, merchant_id, entry_type, amount, balance_before, balance_after, description, created_at
  ) VALUES (
    'b37d3b6a-2d14-43fa-97f5-52576a549bdd', '321084c3-e7a3-4b9e-8d3b-7bff323ceb5d', 'MERCHANT_BALANCE', v_merchant_id, 'DEBIT', 150000, 0, 0, 'Phí dịch vụ demo', now() - interval '6 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '1d426b0c-c46d-4eeb-b439-9409864da6ab', v_merchant_id, 'Demo Key 1', 'pk_test_c8587dee80216b8e', 'dummy_hash_1', 'PRODUCTION', 'ACTIVE', now() - interval '1 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    'c2591f6e-a94e-4bcd-9841-39ac5c8e87fe', v_merchant_id, 'Demo Key 2', 'pk_test_d9237959f5f7d659', 'dummy_hash_2', 'PRODUCTION', 'ACTIVE', now() - interval '2 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '3be11c40-14e7-4768-8655-7af6edb65b5f', v_merchant_id, 'Demo Key 3', 'pk_test_d167b3f3d89a260a', 'dummy_hash_3', 'SANDBOX', 'ACTIVE', now() - interval '3 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    'ef21abde-686c-44f3-8b37-fcc33f22a998', v_merchant_id, 'Demo Key 4', 'pk_test_b87f76626018331b', 'dummy_hash_4', 'SANDBOX', 'ACTIVE', now() - interval '4 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '328e16c9-eb7c-4f83-8403-8d4aec2a8911', v_merchant_id, 'Demo Key 5', 'pk_test_9b02cfddc94a7854', 'dummy_hash_5', 'SANDBOX', 'ACTIVE', now() - interval '5 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '5c1f7f6c-7baa-480b-9077-e0a9e6451cc5', v_merchant_id, 'Demo Key 6', 'pk_test_95552a945328d4c6', 'dummy_hash_6', 'SANDBOX', 'ACTIVE', now() - interval '6 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '0bb2d6e4-9f94-49ae-b43f-ec63f68c11b7', v_merchant_id, 'Demo Key 7', 'pk_test_2a706ca815c9d94e', 'dummy_hash_7', 'SANDBOX', 'ACTIVE', now() - interval '7 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '608b7bf6-3df0-44b1-b500-928d15f215bb', v_merchant_id, 'Demo Key 8', 'pk_test_5b570929f875d020', 'dummy_hash_8', 'SANDBOX', 'ACTIVE', now() - interval '8 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    'bfe8320b-9a82-4f9e-a7e9-a5ebe88834e8', v_merchant_id, 'Demo Key 9', 'pk_test_066e1ebfc484090a', 'dummy_hash_9', 'SANDBOX', 'ACTIVE', now() - interval '9 days', now()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO public.merchant_api_keys (
    id, merchant_id, key_name, api_key, api_secret_hash, environment, status, created_at, updated_at
  ) VALUES (
    '24c328c6-16ce-4b13-bee8-13e08aeeee7d', v_merchant_id, 'Demo Key 10', 'pk_test_70f319a9a3d8a020', 'dummy_hash_10', 'SANDBOX', 'REVOKED', now() - interval '10 days', now()
  ) ON CONFLICT DO NOTHING;

END $$;

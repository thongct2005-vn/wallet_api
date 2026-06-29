-- Convert selected VARCHAR status/type columns to real PostgreSQL ENUM columns.
-- Run on local/demo DB after schema + seed are loaded.

BEGIN;

-- app_settings
ALTER TABLE public.app_settings ALTER COLUMN value_type DROP DEFAULT;
ALTER TABLE public.app_settings ALTER COLUMN value_type TYPE public.setting_value_type USING value_type::text::public.setting_value_type;
ALTER TABLE public.app_settings ALTER COLUMN value_type SET DEFAULT 'STRING'::public.setting_value_type;

-- roles
ALTER TABLE public.roles ALTER COLUMN scope DROP DEFAULT;
ALTER TABLE public.roles ALTER COLUMN scope TYPE public.role_scope USING scope::text::public.role_scope;
ALTER TABLE public.roles ALTER COLUMN scope SET DEFAULT 'SYSTEM'::public.role_scope;

-- users
ALTER TABLE public.users ALTER COLUMN user_type DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN user_type TYPE public.user_type USING user_type::text::public.user_type;
ALTER TABLE public.users ALTER COLUMN status TYPE public.user_status USING status::text::public.user_status;
ALTER TABLE public.users ALTER COLUMN user_type SET DEFAULT 'USER'::public.user_type;
ALTER TABLE public.users ALTER COLUMN status SET DEFAULT 'ACTIVE'::public.user_status;

-- wallets
ALTER TABLE public.wallets ALTER COLUMN wallet_type DROP DEFAULT;
ALTER TABLE public.wallets ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.wallets ALTER COLUMN wallet_type TYPE public.wallet_type USING wallet_type::text::public.wallet_type;
ALTER TABLE public.wallets ALTER COLUMN status TYPE public.wallet_status USING status::text::public.wallet_status;
ALTER TABLE public.wallets ALTER COLUMN wallet_type SET DEFAULT 'PERSONAL'::public.wallet_type;
ALTER TABLE public.wallets ALTER COLUMN status SET DEFAULT 'ACTIVE'::public.wallet_status;

-- deposit/topup
ALTER TABLE public.deposit_transactions ALTER COLUMN deposit_method DROP DEFAULT;
ALTER TABLE public.deposit_transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.deposit_transactions ALTER COLUMN deposit_method TYPE public.deposit_method USING deposit_method::text::public.deposit_method;
ALTER TABLE public.deposit_transactions ALTER COLUMN status TYPE public.deposit_status USING status::text::public.deposit_status;
ALTER TABLE public.deposit_transactions ALTER COLUMN deposit_method SET DEFAULT 'SANDBOX_BANK'::public.deposit_method;
ALTER TABLE public.deposit_transactions ALTER COLUMN status SET DEFAULT 'PENDING'::public.deposit_status;

-- transfer
ALTER TABLE public.wallet_transfers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.wallet_transfers ALTER COLUMN status TYPE public.transfer_status USING status::text::public.transfer_status;
ALTER TABLE public.wallet_transfers ALTER COLUMN status SET DEFAULT 'PENDING'::public.transfer_status;

-- withdrawal
ALTER TABLE public.withdrawal_transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.withdrawal_transactions ALTER COLUMN status TYPE public.withdrawal_status USING status::text::public.withdrawal_status;
ALTER TABLE public.withdrawal_transactions ALTER COLUMN status SET DEFAULT 'PENDING'::public.withdrawal_status;

-- merchants
ALTER TABLE public.merchants ALTER COLUMN business_type DROP DEFAULT;
ALTER TABLE public.merchants ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.merchants ALTER COLUMN business_type TYPE public.business_type USING business_type::text::public.business_type;
ALTER TABLE public.merchants ALTER COLUMN status TYPE public.merchant_status USING status::text::public.merchant_status;
ALTER TABLE public.merchants ALTER COLUMN business_type SET DEFAULT 'ONLINE'::public.business_type;
ALTER TABLE public.merchants ALTER COLUMN status SET DEFAULT 'PENDING_REVIEW'::public.merchant_status;

-- merchant API keys
ALTER TABLE public.merchant_api_keys ALTER COLUMN environment DROP DEFAULT;
ALTER TABLE public.merchant_api_keys ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.merchant_api_keys ALTER COLUMN environment TYPE public.api_environment USING environment::text::public.api_environment;
ALTER TABLE public.merchant_api_keys ALTER COLUMN status TYPE public.api_key_status USING status::text::public.api_key_status;
ALTER TABLE public.merchant_api_keys ALTER COLUMN environment SET DEFAULT 'SANDBOX'::public.api_environment;
ALTER TABLE public.merchant_api_keys ALTER COLUMN status SET DEFAULT 'ACTIVE'::public.api_key_status;

-- payment orders
ALTER TABLE public.payment_orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.payment_orders ALTER COLUMN refund_status DROP DEFAULT;
ALTER TABLE public.payment_orders ALTER COLUMN status TYPE public.payment_order_status USING status::text::public.payment_order_status;
ALTER TABLE public.payment_orders ALTER COLUMN refund_status TYPE public.payment_refund_status USING refund_status::text::public.payment_refund_status;
ALTER TABLE public.payment_orders ALTER COLUMN status SET DEFAULT 'PENDING'::public.payment_order_status;
ALTER TABLE public.payment_orders ALTER COLUMN refund_status SET DEFAULT 'NONE'::public.payment_refund_status;

-- payment QR
ALTER TABLE public.payment_qr_codes ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.payment_qr_codes ALTER COLUMN status TYPE public.qr_status USING status::text::public.qr_status;
ALTER TABLE public.payment_qr_codes ALTER COLUMN status SET DEFAULT 'ACTIVE'::public.qr_status;

-- payment transactions
ALTER TABLE public.payment_transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.payment_transactions ALTER COLUMN status TYPE public.payment_transaction_status USING status::text::public.payment_transaction_status;
ALTER TABLE public.payment_transactions ALTER COLUMN status SET DEFAULT 'PENDING'::public.payment_transaction_status;

-- refunds
ALTER TABLE public.refund_transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.refund_transactions ALTER COLUMN status TYPE public.refund_status USING status::text::public.refund_status;
ALTER TABLE public.refund_transactions ALTER COLUMN status SET DEFAULT 'PENDING'::public.refund_status;

-- ledger
ALTER TABLE public.ledger_transactions ALTER COLUMN transaction_type DROP DEFAULT;
ALTER TABLE public.ledger_transactions ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.ledger_transactions ALTER COLUMN transaction_type TYPE public.ledger_transaction_type USING transaction_type::text::public.ledger_transaction_type;
ALTER TABLE public.ledger_transactions ALTER COLUMN status TYPE public.transaction_status USING status::text::public.transaction_status;
ALTER TABLE public.ledger_transactions ALTER COLUMN status SET DEFAULT 'PENDING'::public.transaction_status;

ALTER TABLE public.ledger_entries ALTER COLUMN account_type TYPE public.ledger_account_type USING account_type::text::public.ledger_account_type;
ALTER TABLE public.ledger_entries ALTER COLUMN entry_type TYPE public.ledger_entry_type USING entry_type::text::public.ledger_entry_type;

-- outbox/webhook
ALTER TABLE public.outbox_events ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.outbox_events ALTER COLUMN event_type TYPE public.webhook_event_type USING event_type::text::public.webhook_event_type;
ALTER TABLE public.outbox_events ALTER COLUMN status TYPE public.webhook_status USING status::text::public.webhook_status;
ALTER TABLE public.outbox_events ALTER COLUMN status SET DEFAULT 'PENDING'::public.webhook_status;

-- idempotency
ALTER TABLE public.idempotency_keys ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.idempotency_keys ALTER COLUMN actor_type TYPE public.idempotency_actor_type USING actor_type::text::public.idempotency_actor_type;
ALTER TABLE public.idempotency_keys ALTER COLUMN status TYPE public.idempotency_status USING status::text::public.idempotency_status;
ALTER TABLE public.idempotency_keys ALTER COLUMN status SET DEFAULT 'PROCESSING'::public.idempotency_status;

COMMIT;

-- Verify converted enum columns
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (
    ('users','user_type'), ('users','status'),
    ('roles','scope'),
    ('wallets','wallet_type'), ('wallets','status'),
    ('deposit_transactions','deposit_method'), ('deposit_transactions','status'),
    ('wallet_transfers','status'),
    ('withdrawal_transactions','status'),
    ('merchants','business_type'), ('merchants','status'),
    ('merchant_api_keys','environment'), ('merchant_api_keys','status'),
    ('payment_orders','status'), ('payment_orders','refund_status'),
    ('payment_qr_codes','status'),
    ('payment_transactions','status'),
    ('refund_transactions','status'),
    ('ledger_transactions','transaction_type'), ('ledger_transactions','status'),
    ('ledger_entries','account_type'), ('ledger_entries','entry_type'),
    ('outbox_events','event_type'), ('outbox_events','status'),
    ('idempotency_keys','actor_type'), ('idempotency_keys','status'),
    ('app_settings','value_type')
  )
ORDER BY table_name, column_name;

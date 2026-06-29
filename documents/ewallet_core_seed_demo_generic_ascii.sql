-- =========================================================
-- Seed data demo/anonymized cho ewallet_core_db
-- Du lieu duoc tao moi hoan toan de tham khao nghiep vu vi dien tu va cong thanh toan.
-- Khong su dung ten cong ty, domain, ma khach hang hay du lieu noi bo cua bat ky don vi nao.
--
-- Cach dung:
--   psql -U postgres -h localhost -p 5433 -d ewallet_core_db -f ewallet_core_seed_demo_generic_ascii.sql
--
-- Tai khoan demo:
--   Mat khau chung: Demo@123456
--   PIN vi demo:   000000
--
-- Luu y:
-- - API secret / token trong file nay chi la hash demo, khong dung cho production.
-- - File co guard chong chay lap bang email superadmin@ewallet-demo.test.
-- =========================================================

\set ON_ERROR_STOP on
BEGIN;
SET search_path TO public;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE email = 'superadmin@ewallet-demo.test') THEN
    RAISE EXCEPTION 'Demo seed ewallet_core_seed_demo_generic_ascii.sql already exists. Please import into a clean database or delete demo data first.';
  END IF;
END;
$$;

-- =========================================================
-- 1. App settings & code sequences
-- =========================================================

INSERT INTO app_settings (id, setting_group, setting_key, setting_value, value_type, description, is_sensitive, created_at, updated_at)
VALUES
  ('09000000-0000-0000-0000-000000000001', 'AUTH', 'access_token_ttl_minutes', '60'::jsonb, 'NUMBER', 'Access token TTL for user/admin/merchant portal', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000002', 'AUTH', 'refresh_token_ttl_days', '7'::jsonb, 'NUMBER', 'Refresh token TTL', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000003', 'AUTH', 'max_login_attempts', '5'::jsonb, 'NUMBER', 'Temporary lock after failed login attempts', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000004', 'PAYMENT', 'payment_expiry_minutes', '15'::jsonb, 'NUMBER', 'Default payment order expiry in minutes', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000005', 'PAYMENT', 'signature_timestamp_tolerance_minutes', '5'::jsonb, 'NUMBER', 'Merchant API timestamp tolerance', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000006', 'QR', 'qr_expiry_minutes', '15'::jsonb, 'NUMBER', 'Dynamic QR expiry in minutes', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000007', 'WEBHOOK', 'webhook_max_retry', '5'::jsonb, 'NUMBER', 'Maximum webhook retry count', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000008', 'WEBHOOK', 'webhook_retry_schedule', '"1m,5m,15m,1h,6h"'::jsonb, 'STRING', 'Webhook retry schedule', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000009', 'WALLET', 'default_currency', '"VND"'::jsonb, 'STRING', 'Default wallet currency', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09000000-0000-0000-0000-000000000010', 'LOGGING', 'audit_log_retention_days', '365'::jsonb, 'NUMBER', 'Audit log retention days', false, '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_group = EXCLUDED.setting_group,
  setting_value = EXCLUDED.setting_value,
  value_type = EXCLUDED.value_type,
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at;

INSERT INTO code_sequences (id, resource_name, prefix, current_value, padding, reset_policy, created_at, updated_at)
VALUES
  ('09100000-0000-0000-0000-000000000001', 'wallet_no', 'WAL', 105, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09100000-0000-0000-0000-000000000002', 'transaction_no', 'TXN', 8, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09100000-0000-0000-0000-000000000003', 'deposit_no', 'DPT', 5, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09100000-0000-0000-0000-000000000004', 'transfer_no', 'TRF', 3, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09100000-0000-0000-0000-000000000005', 'payment_no', 'PAY', 4, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09100000-0000-0000-0000-000000000006', 'refund_no', 'RFD', 1, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07'),
  ('09100000-0000-0000-0000-000000000007', 'merchant_code', 'MER', 3, 6, 'NONE', '2026-06-20 07:00:00+07', '2026-06-20 07:00:00+07')
ON CONFLICT (resource_name) DO UPDATE SET
  current_value = GREATEST(code_sequences.current_value, EXCLUDED.current_value),
  updated_at = EXCLUDED.updated_at;

-- =========================================================
-- 2. Roles, permissions, role permissions
-- =========================================================

INSERT INTO roles (id, code, name, scope, description, is_system, is_active, created_at, updated_at)
VALUES
  ('01000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Super Admin', 'SYSTEM', 'Toan quyen he thong vi dien tu va cong thanh toan', true, true, '2026-06-20 07:05:00+07', '2026-06-20 07:05:00+07'),
  ('01000000-0000-0000-0000-000000000002', 'ADMIN', 'Admin', 'SYSTEM', 'Quan tri van hanh user, vi, merchant, giao dich', true, true, '2026-06-20 07:05:00+07', '2026-06-20 07:05:00+07'),
  ('01000000-0000-0000-0000-000000000003', 'SUPPORT_STAFF', 'Support Staff', 'SYSTEM', 'Tra cuu read-only va ho tro xu ly loi', true, true, '2026-06-20 07:05:00+07', '2026-06-20 07:05:00+07'),
  ('01000000-0000-0000-0000-000000000004', 'USER', 'Wallet User', 'SYSTEM', 'Nguoi dung vi dien tu mobile app', true, true, '2026-06-20 07:05:00+07', '2026-06-20 07:05:00+07'),
  ('01000000-0000-0000-0000-000000000005', 'MERCHANT_OWNER', 'Merchant Owner', 'MERCHANT', 'Chu merchant quan ly dashboard, API key, callback', true, true, '2026-06-20 07:05:00+07', '2026-06-20 07:05:00+07'),
  ('01000000-0000-0000-0000-000000000006', 'MERCHANT_STAFF', 'Merchant Staff', 'MERCHANT', 'Nhan su merchant tra cuu payment va webhook', true, true, '2026-06-20 07:05:00+07', '2026-06-20 07:05:00+07')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permissions (id, code, name, description, created_at)
VALUES
  ('02000000-0000-0000-0000-000000000001', 'auth.me.read', 'Read current profile', 'Xem thong tin tai khoan dang dang nhap', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000002', 'wallets.me.read', 'Read own wallet', 'User xem vi cua minh', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000003', 'wallets.me.statement.read', 'Read own wallet statement', 'User xem bien dong so du vi', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000004', 'topups.create', 'Create topup', 'User tao nap tien gia lap', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000005', 'topups.me.read', 'Read own topups', 'User xem lich su nap tien', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000006', 'transfers.create', 'Create transfer', 'User chuyen tien vi', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000007', 'transfers.me.read', 'Read own transfers', 'User xem lich su chuyen tien', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000008', 'qr-payments.resolve', 'Resolve QR payment', 'User quet QR va xem thong tin thanh toan', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000009', 'qr-payments.confirm', 'Confirm QR payment', 'User xac nhan thanh toan QR', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000010', 'transactions.me.read', 'Read own transactions', 'User xem lich su giao dich vi', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000011', 'refunds.me.read', 'Read own refunds', 'User xem lich su hoan tien', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000012', 'merchant.dashboard.read', 'Read merchant dashboard', 'Merchant xem dashboard rieng', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000013', 'merchant.profile.read', 'Read merchant profile', 'Merchant xem profile', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000014', 'merchant.profile.update', 'Update merchant profile', 'Merchant cap nhat profile/callback', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000015', 'merchant.api_keys.read', 'Read merchant API keys', 'Merchant xem API key', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000016', 'merchant.api_keys.create', 'Create merchant API key', 'Merchant tao API key', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000017', 'merchant.api_keys.rotate', 'Rotate merchant API key', 'Merchant rotate secret', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000018', 'merchant.payments.read', 'Read merchant payments', 'Merchant xem payment cua minh', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000019', 'merchant.refunds.create', 'Create merchant refund', 'Merchant tao refund', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000020', 'merchant.webhooks.read', 'Read merchant webhooks', 'Merchant xem webhook log', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000021', 'merchant.webhooks.retry', 'Retry merchant webhook', 'Merchant retry webhook cua minh', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000022', 'admin.users.read', 'Admin read users', 'Admin xem user', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000023', 'admin.users.lock', 'Admin lock users', 'Admin khoa user', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000024', 'admin.wallets.read', 'Admin read wallets', 'Admin xem vi', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000025', 'admin.wallets.lock', 'Admin lock wallets', 'Admin khoa/mo vi', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000026', 'admin.merchants.read', 'Admin read merchants', 'Admin xem merchant', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000027', 'admin.merchants.manage', 'Admin manage merchants', 'Admin tao/duyet/tam ngung merchant', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000028', 'admin.transactions.read', 'Admin read transactions', 'Admin xem giao dich va ledger', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000029', 'admin.webhooks.read', 'Admin read webhooks', 'Admin xem webhook toan he thong', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000030', 'admin.webhooks.retry', 'Admin retry webhooks', 'Admin retry callback thu cong', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000031', 'admin.audit_logs.read', 'Admin read audit logs', 'Admin xem audit/security/system log', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000032', 'admin.dashboard.read', 'Admin read dashboard', 'Admin xem dashboard he thong', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000033', 'admin.settings.manage', 'Admin manage settings', 'Super Admin cau hinh he thong', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000034', 'admin.reports.read', 'Admin read reports', 'Admin xem bao cao', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000035', 'admin.users.create', 'Admin create users', 'Admin tao nguoi dung moi', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000036', 'admin.users.update', 'Admin update users', 'Admin cap nhat thong tin nguoi dung', '2026-06-20 07:10:00+07'),
  ('02000000-0000-0000-0000-000000000037', 'admin.users.reset_password', 'Admin reset password users', 'Admin reset mat khau nguoi dung', '2026-06-20 07:10:00+07')
ON CONFLICT (code) DO NOTHING;

-- Super Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, '2026-06-20 07:15:00+07'
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- Admin: all admin read/manage except setting manage, plus merchant read/payment read
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, '2026-06-20 07:16:00+07'
FROM roles r JOIN permissions p ON p.code LIKE 'admin.%'
WHERE r.code = 'ADMIN' AND p.code <> 'admin.settings.manage'
ON CONFLICT DO NOTHING;

-- Support staff: read-only operations
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, '2026-06-20 07:17:00+07'
FROM roles r JOIN permissions p ON p.code IN (
  'auth.me.read', 'admin.users.read', 'admin.wallets.read', 'admin.merchants.read',
  'admin.transactions.read', 'admin.webhooks.read', 'admin.audit_logs.read',
  'admin.dashboard.read', 'admin.reports.read'
)
WHERE r.code = 'SUPPORT_STAFF'
ON CONFLICT DO NOTHING;

-- Merchant Owner: full merchant portal permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, '2026-06-20 07:18:00+07'
FROM roles r JOIN permissions p ON p.code LIKE 'merchant.%' OR p.code = 'auth.me.read'
WHERE r.code = 'MERCHANT_OWNER'
ON CONFLICT DO NOTHING;

-- Merchant Staff: read-only merchant permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, '2026-06-20 07:19:00+07'
FROM roles r JOIN permissions p ON p.code IN (
  'auth.me.read', 'merchant.dashboard.read', 'merchant.profile.read',
  'merchant.payments.read', 'merchant.webhooks.read'
)
WHERE r.code = 'MERCHANT_STAFF'
ON CONFLICT DO NOTHING;

-- Wallet User: mobile app permissions
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, '2026-06-20 07:20:00+07'
FROM roles r JOIN permissions p ON p.code IN (
  'auth.me.read', 'wallets.me.read', 'wallets.me.statement.read',
  'topups.create', 'topups.me.read', 'transfers.create', 'transfers.me.read',
  'qr-payments.resolve', 'qr-payments.confirm', 'transactions.me.read', 'refunds.me.read'
)
WHERE r.code = 'USER'
ON CONFLICT DO NOTHING;

-- =========================================================
-- 3. Users: admin, merchant users, wallet users
-- =========================================================

INSERT INTO users (id, user_type, full_name, username, email, phone, password_hash, status, failed_login_attempts, locked_until, last_login_at, is_kyc_verified, pin_hash, token_version, created_at, updated_at, loyalty_member_id, email_otp, email_otp_expired_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'SUPER_ADMIN', 'Nguyen Demo Admin', 'superadmin', 'superadmin@ewallet-demo.test', '0909111111', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 08:10:00+07', true, NULL, 1, '2026-06-20 07:30:00+07', '2026-06-20 08:10:00+07', NULL, NULL, NULL),
  ('10000000-0000-0000-0000-000000000002', 'ADMIN', 'Tran Demo Ops', 'admin.ops', 'admin@ewallet-demo.test', '0909222222', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 08:20:00+07', true, NULL, 1, '2026-06-20 07:31:00+07', '2026-06-20 08:20:00+07', NULL, NULL, NULL),
  ('10000000-0000-0000-0000-000000000003', 'SUPPORT_STAFF', 'Le Demo Support', 'support.ops', 'support@ewallet-demo.test', '0909333333', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 08:30:00+07', true, NULL, 1, '2026-06-20 07:32:00+07', '2026-06-20 08:30:00+07', NULL, NULL, NULL),
  ('10000000-0000-0000-0000-000000000004', 'MERCHANT_USER', 'Pham Merchant Owner', 'owner.alpha', 'owner@alpha-mart.test', '0909444444', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 08:40:00+07', true, NULL, 1, '2026-06-20 07:33:00+07', '2026-06-20 08:40:00+07', NULL, NULL, NULL),
  ('10000000-0000-0000-0000-000000000005', 'MERCHANT_USER', 'Dang Merchant Staff', 'staff.beta', 'staff@beta-coffee.test', '0909555555', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 08:45:00+07', true, NULL, 1, '2026-06-20 07:34:00+07', '2026-06-20 08:45:00+07', NULL, NULL, NULL),
  ('10000000-0000-0000-0000-000000000101', 'USER', 'Nguyen Thi An', 'an.nguyen', 'an@customer.test', '0911000001', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 09:00:00+07', true, '$2b$10$YKyDhOPeG2iZJjwql4CNhO6nZevsjhK/z7JhAWXpihqPgKDnnv4lW', 1, '2026-06-20 07:40:00+07', '2026-06-20 09:00:00+07', 'LOYALTY-DEMO-000001', NULL, NULL),
  ('10000000-0000-0000-0000-000000000102', 'USER', 'Tran Minh Binh', 'binh.tran', 'binh@customer.test', '0911000002', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 09:05:00+07', true, '$2b$10$YKyDhOPeG2iZJjwql4CNhO6nZevsjhK/z7JhAWXpihqPgKDnnv4lW', 1, '2026-06-20 07:41:00+07', '2026-06-20 09:05:00+07', 'LOYALTY-DEMO-000002', NULL, NULL),
  ('10000000-0000-0000-0000-000000000103', 'USER', 'Le Thanh Chi', 'chi.le', 'chi@customer.test', '0911000003', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 09:10:00+07', true, '$2b$10$YKyDhOPeG2iZJjwql4CNhO6nZevsjhK/z7JhAWXpihqPgKDnnv4lW', 1, '2026-06-20 07:42:00+07', '2026-06-20 09:10:00+07', 'LOYALTY-DEMO-000003', NULL, NULL),
  ('10000000-0000-0000-0000-000000000104', 'USER', 'Pham Quoc Dung', 'dung.pham', 'dung@customer.test', '0911000004', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'ACTIVE', 0, NULL, '2026-06-20 09:15:00+07', true, '$2b$10$YKyDhOPeG2iZJjwql4CNhO6nZevsjhK/z7JhAWXpihqPgKDnnv4lW', 1, '2026-06-20 07:43:00+07', '2026-06-20 09:15:00+07', 'LOYALTY-DEMO-000004', NULL, NULL),
  ('10000000-0000-0000-0000-000000000105', 'USER', 'Do Hoai Giang', 'giang.do', 'giang@customer.test', '0911000005', '$2b$10$5LcBk4SZrWQAR4b8j7.gSuDXwEuZ7wcuMl.UJ5NPVpUNU1KFkb45e', 'LOCKED', 5, '2026-06-21 08:00:00+07', '2026-06-19 18:00:00+07', false, '$2b$10$YKyDhOPeG2iZJjwql4CNhO6nZevsjhK/z7JhAWXpihqPgKDnnv4lW', 2, '2026-06-20 07:44:00+07', '2026-06-20 07:44:00+07', 'LOYALTY-DEMO-000005', NULL, NULL);

INSERT INTO user_roles (user_id, role_id, created_at)
SELECT '10000000-0000-0000-0000-000000000001'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'SUPER_ADMIN'
UNION ALL SELECT '10000000-0000-0000-0000-000000000002'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'ADMIN'
UNION ALL SELECT '10000000-0000-0000-0000-000000000003'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'SUPPORT_STAFF'
UNION ALL SELECT '10000000-0000-0000-0000-000000000004'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'MERCHANT_OWNER'
UNION ALL SELECT '10000000-0000-0000-0000-000000000005'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'MERCHANT_STAFF'
UNION ALL SELECT '10000000-0000-0000-0000-000000000101'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'USER'
UNION ALL SELECT '10000000-0000-0000-0000-000000000102'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'USER'
UNION ALL SELECT '10000000-0000-0000-0000-000000000103'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'USER'
UNION ALL SELECT '10000000-0000-0000-0000-000000000104'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'USER'
UNION ALL SELECT '10000000-0000-0000-0000-000000000105'::uuid, id, '2026-06-20 07:50:00+07'::timestamptz FROM roles WHERE code = 'USER';

-- =========================================================
-- 4. Wallets, balances, limits, KYC, linked banks, devices
-- =========================================================

INSERT INTO wallets (id, user_id, wallet_no, wallet_code, wallet_type, currency, status, lock_reason, locked_at, locked_by, closed_at, pin_failed_attempts, pin_locked_until, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000101', 'WAL000101', 'EWALLET-AN-001', 'PERSONAL', 'VND', 'ACTIVE', NULL, NULL, NULL, NULL, 0, NULL, '2026-06-20 07:45:00+07', '2026-06-20 11:20:00+07'),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000102', 'WAL000102', 'EWALLET-BINH-001', 'PERSONAL', 'VND', 'ACTIVE', NULL, NULL, NULL, NULL, 0, NULL, '2026-06-20 07:46:00+07', '2026-06-20 09:25:00+07'),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000103', 'WAL000103', 'EWALLET-CHI-001', 'PERSONAL', 'VND', 'ACTIVE', NULL, NULL, NULL, NULL, 0, NULL, '2026-06-20 07:47:00+07', '2026-06-20 09:25:00+07'),
  ('20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000104', 'WAL000104', 'EWALLET-DUNG-001', 'PERSONAL', 'VND', 'ACTIVE', NULL, NULL, NULL, NULL, 1, NULL, '2026-06-20 07:48:00+07', '2026-06-20 12:05:00+07'),
  ('20000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000105', 'WAL000105', 'EWALLET-GIANG-001', 'PERSONAL', 'VND', 'LOCKED', 'Khoa tam do dang nhap sai nhieu lan', '2026-06-20 08:00:00+07', '10000000-0000-0000-0000-000000000002', NULL, 3, '2026-06-21 08:00:00+07', '2026-06-20 07:49:00+07', '2026-06-20 08:00:00+07');

INSERT INTO wallet_balances (wallet_id, available_balance, locked_balance, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000101', 4330000, 0, '2026-06-20 11:20:00+07'),
  ('20000000-0000-0000-0000-000000000102', 2770000, 0, '2026-06-20 09:25:00+07'),
  ('20000000-0000-0000-0000-000000000103', 1380000, 0, '2026-06-20 09:25:00+07'),
  ('20000000-0000-0000-0000-000000000104', 300000, 0, '2026-06-20 08:40:00+07'),
  ('20000000-0000-0000-0000-000000000105', 0, 0, '2026-06-20 08:00:00+07');

INSERT INTO wallet_limits (wallet_id, daily_deposit_limit, daily_withdrawal_limit, daily_transaction_limit, monthly_transaction_limit, monthly_special_service_limit, created_at, updated_at)
VALUES
  ('20000000-0000-0000-0000-000000000101', 50000000, 50000000, 50000000, 200000000, 300000000, '2026-06-20 07:45:00+07', '2026-06-20 07:45:00+07'),
  ('20000000-0000-0000-0000-000000000102', 50000000, 50000000, 50000000, 200000000, 300000000, '2026-06-20 07:46:00+07', '2026-06-20 07:46:00+07'),
  ('20000000-0000-0000-0000-000000000103', 50000000, 50000000, 50000000, 200000000, 300000000, '2026-06-20 07:47:00+07', '2026-06-20 07:47:00+07'),
  ('20000000-0000-0000-0000-000000000104', 50000000, 50000000, 50000000, 200000000, 300000000, '2026-06-20 07:48:00+07', '2026-06-20 07:48:00+07'),
  ('20000000-0000-0000-0000-000000000105', 10000000, 10000000, 10000000, 30000000, 50000000, '2026-06-20 07:49:00+07', '2026-06-20 07:49:00+07');

INSERT INTO user_kyc (id, user_id, id_number, full_name, dob, gender, address, id_front_image, id_back_image, face_image, kyc_status, face_match_score, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at)
VALUES
  ('21000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000101', '079094000001', 'Nguyen Thi An', '1994-08-12', 'FEMALE', '7 Demo Street, District 1, Ho Chi Minh City', 'https://cdn.ewallet-demo.test/kyc/an-front.jpg', 'https://cdn.ewallet-demo.test/kyc/an-back.jpg', 'https://cdn.ewallet-demo.test/kyc/an-face.jpg', 'APPROVED', 98.75, NULL, '10000000-0000-0000-0000-000000000002', '2026-06-20 08:20:00+07', '2026-06-20 08:00:00+07', '2026-06-20 08:20:00+07'),
  ('21000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000102', '079090000002', 'Tran Minh Binh', '1990-03-04', 'MALE', '25 Demo Street, District 1, Ho Chi Minh City', 'https://cdn.ewallet-demo.test/kyc/binh-front.jpg', 'https://cdn.ewallet-demo.test/kyc/binh-back.jpg', 'https://cdn.ewallet-demo.test/kyc/binh-face.jpg', 'APPROVED', 97.20, NULL, '10000000-0000-0000-0000-000000000002', '2026-06-20 08:22:00+07', '2026-06-20 08:01:00+07', '2026-06-20 08:22:00+07'),
  ('21000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000103', '079096000003', 'Le Thanh Chi', '1996-11-09', 'FEMALE', '88 Demo Road, District 7, Ho Chi Minh City', 'https://cdn.ewallet-demo.test/kyc/chi-front.jpg', 'https://cdn.ewallet-demo.test/kyc/chi-back.jpg', 'https://cdn.ewallet-demo.test/kyc/chi-face.jpg', 'APPROVED', 96.80, NULL, '10000000-0000-0000-0000-000000000002', '2026-06-20 08:24:00+07', '2026-06-20 08:02:00+07', '2026-06-20 08:24:00+07');

INSERT INTO wallet_linked_banks (id, wallet_id, bank_name, bank_code, card_number, card_holder_name, issue_date, status, created_at, updated_at)
VALUES
  ('22000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 'Vietcombank', 'VCB', '970436******0001', 'NGUYEN THI AN', '05/25', 'ACTIVE', '2026-06-20 08:05:00+07', '2026-06-20 08:05:00+07'),
  ('22000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', 'Techcombank', 'TCB', '970407******0002', 'TRAN MINH BINH', '11/24', 'ACTIVE', '2026-06-20 08:06:00+07', '2026-06-20 08:06:00+07'),
  ('22000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103', 'MB Bank', 'MBB', '970422******0003', 'LE THANH CHI', '02/26', 'ACTIVE', '2026-06-20 08:07:00+07', '2026-06-20 08:07:00+07');

INSERT INTO user_devices (id, user_id, fcm_token, device_name, device_type, last_seen_at, created_at, updated_at)
VALUES
  ('23000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000101', 'demo-fcm-ios-an-001', 'iPhone 15 Pro', 'IOS', '2026-06-20 11:30:00+07', '2026-06-20 09:00:00+07', '2026-06-20 11:30:00+07'),
  ('23000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000102', 'demo-fcm-android-binh-001', 'Samsung Galaxy S24', 'ANDROID', '2026-06-20 09:30:00+07', '2026-06-20 09:05:00+07', '2026-06-20 09:30:00+07'),
  ('23000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000103', 'demo-fcm-ios-chi-001', 'iPhone 14', 'IOS', '2026-06-20 09:35:00+07', '2026-06-20 09:10:00+07', '2026-06-20 09:35:00+07');

-- =========================================================
-- 5. Merchants, merchant users, API keys, callback configs
-- =========================================================

INSERT INTO merchants (id, merchant_code, merchant_name, business_type, representative_name, tax_code, phone, email, address, status, risk_note, created_at, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'MER000001', 'Alpha Mart Online', 'BOTH', 'Pham Merchant Owner', '0312345678', '0909000001', 'payments@alpha-mart.test', '12 Demo Avenue, District 1, Ho Chi Minh City', 'ACTIVE', 'Merchant demo duoc tao moi de test cong thanh toan', '2026-06-20 08:10:00+07', '2026-06-20 08:30:00+07'),
  ('30000000-0000-0000-0000-000000000002', 'MER000002', 'Beta Coffee Store', 'OFFLINE', 'Dang Merchant Staff', '0312345679', '0909000002', 'pos@beta-coffee.test', '88 Demo Road, District 7, Ho Chi Minh City', 'ACTIVE', 'Cua hang demo dung POS QR', '2026-06-20 08:11:00+07', '2026-06-20 08:31:00+07'),
  ('30000000-0000-0000-0000-000000000003', 'MER000003', 'Lotus Bookstore', 'ONLINE', 'Tran Demo Store', '0312345680', '0909000003', 'lotus@merchant.test', '99 Demo Street, District 3, Ho Chi Minh City', 'PENDING_REVIEW', 'Merchant demo online cho duyet ho so', '2026-06-20 08:12:00+07', '2026-06-20 08:12:00+07');

INSERT INTO merchant_balances (merchant_id, available_balance, pending_balance, updated_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', 220000, 0, '2026-06-20 11:20:00+07'),
  ('30000000-0000-0000-0000-000000000002', 0, 0, '2026-06-20 08:31:00+07'),
  ('30000000-0000-0000-0000-000000000003', 0, 0, '2026-06-20 08:12:00+07');

INSERT INTO merchant_users (id, merchant_id, user_id, role_code, is_owner, is_active, created_at, updated_at)
VALUES
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'MERCHANT_OWNER', true, true, '2026-06-20 08:15:00+07', '2026-06-20 08:15:00+07'),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'MERCHANT_STAFF', false, true, '2026-06-20 08:16:00+07', '2026-06-20 08:16:00+07');

INSERT INTO merchant_callback_configs (id, merchant_id, default_callback_url, default_redirect_url, webhook_secret_hash, callback_enabled, retry_enabled, created_at, updated_at)
VALUES
  ('32000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'https://merchant.alpha-mart.test/webhooks/demopay', 'https://merchant.alpha-mart.test/payment/result', 'sha256:demo-webhook-secret-alpha-mart', true, true, '2026-06-20 08:20:00+07', '2026-06-20 08:20:00+07'),
  ('32000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'https://beta-coffee.test/webhooks/demopay', 'https://beta-coffee.test/payment/result', 'sha256:demo-webhook-secret-beta-coffee', true, true, '2026-06-20 08:21:00+07', '2026-06-20 08:21:00+07'),
  ('32000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'https://lotus-bookstore.test/webhooks/demopay', 'https://lotus-bookstore.test/checkout/result', 'sha256:demo-webhook-secret-lotus-bookstore', false, true, '2026-06-20 08:22:00+07', '2026-06-20 08:22:00+07');

INSERT INTO merchant_api_keys (id, merchant_id, key_name, api_key, api_secret_hash, environment, status, last_used_at, expired_at, revoked_at, created_at, updated_at)
VALUES
  ('33000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Alpha Mart Sandbox Key', 'pgk_test_alpha_mart_000001', 'sha256:demo-api-secret-alpha-mart', 'SANDBOX', 'ACTIVE', '2026-06-20 11:00:00+07', NULL, NULL, '2026-06-20 08:25:00+07', '2026-06-20 11:00:00+07'),
  ('33000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'Beta Coffee POS Key', 'pgk_test_beta_coffee_000002', 'sha256:demo-api-secret-beta-coffee', 'SANDBOX', 'ACTIVE', '2026-06-20 11:00:00+07', NULL, NULL, '2026-06-20 08:26:00+07', '2026-06-20 11:00:00+07'),
  ('33000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 'Lotus Pending Key', 'pgk_test_lotus_bookstore_000003', 'sha256:demo-api-secret-lotus-bookstore', 'SANDBOX', 'REVOKED', NULL, NULL, '2026-06-20 08:45:00+07', '2026-06-20 08:27:00+07', '2026-06-20 08:45:00+07');

-- =========================================================
-- 6. Deposit/topup transactions
-- =========================================================

INSERT INTO deposit_transactions (id, deposit_no, user_id, wallet_id, amount, currency, deposit_method, external_reference, idempotency_key, status, failure_reason, description, completed_at, created_at, updated_at)
VALUES
  ('60000000-0000-0000-0000-000000000001', 'DPT000001', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 5000000, 'VND', 'SANDBOX_BANK', 'VCB-SBX-20260620-0001', 'idem-topup-an-0001', 'SUCCESS', NULL, 'Nap tien tu Vietcombank sandbox', '2026-06-20 08:05:00+07', '2026-06-20 08:04:30+07', '2026-06-20 08:05:00+07'),
  ('60000000-0000-0000-0000-000000000002', 'DPT000002', '10000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', 2500000, 'VND', 'SANDBOX_BANK', 'TCB-SBX-20260620-0002', 'idem-topup-binh-0001', 'SUCCESS', NULL, 'Nap tien tu Techcombank sandbox', '2026-06-20 08:15:00+07', '2026-06-20 08:14:40+07', '2026-06-20 08:15:00+07'),
  ('60000000-0000-0000-0000-000000000003', 'DPT000003', '10000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103', 1200000, 'VND', 'SANDBOX_CARD', 'MBB-SBX-20260620-0003', 'idem-topup-chi-0001', 'SUCCESS', NULL, 'Nap tien bang the sandbox', '2026-06-20 08:25:00+07', '2026-06-20 08:24:20+07', '2026-06-20 08:25:00+07'),
  ('60000000-0000-0000-0000-000000000004', 'DPT000004', '10000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000104', 300000, 'VND', 'SANDBOX_BANK', 'VCB-SBX-20260620-0004', 'idem-topup-dung-0001', 'SUCCESS', NULL, 'Nap tien thu nghiem cho user it so du', '2026-06-20 08:35:00+07', '2026-06-20 08:34:30+07', '2026-06-20 08:35:00+07'),
  ('60000000-0000-0000-0000-000000000005', 'DPT000005', '10000000-0000-0000-0000-000000000105', '20000000-0000-0000-0000-000000000105', 1000000, 'VND', 'SANDBOX_BANK', 'VCB-SBX-20260620-0005', 'idem-topup-giang-0001', 'FAILED', 'WALLET_NOT_ACTIVE', 'Nap tien that bai vi vi dang bi khoa', NULL, '2026-06-20 08:40:00+07', '2026-06-20 08:40:10+07');

-- =========================================================
-- 7. Wallet transfers
-- =========================================================

INSERT INTO wallet_transfers (id, transfer_no, sender_user_id, sender_wallet_id, receiver_user_id, receiver_wallet_id, amount, currency, description, idempotency_key, status, failure_reason, completed_at, created_at, updated_at)
VALUES
  ('61000000-0000-0000-0000-000000000001', 'TRF000001', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', 450000, 'VND', 'Chuyen tien chia hoa don an uong', 'idem-transfer-an-binh-0001', 'SUCCESS', NULL, '2026-06-20 09:10:00+07', '2026-06-20 09:09:40+07', '2026-06-20 09:10:00+07'),
  ('61000000-0000-0000-0000-000000000002', 'TRF000002', '10000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103', 180000, 'VND', 'Chia tien don hang banh ngot', 'idem-transfer-binh-chi-0001', 'SUCCESS', NULL, '2026-06-20 09:25:00+07', '2026-06-20 09:24:40+07', '2026-06-20 09:25:00+07'),
  ('61000000-0000-0000-0000-000000000003', 'TRF000003', '10000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 900000, 'VND', 'Thu chuyen vuot so du', 'idem-transfer-dung-an-0001', 'FAILED', 'INSUFFICIENT_BALANCE', NULL, '2026-06-20 12:00:00+07', '2026-06-20 12:00:10+07');

-- =========================================================
-- 8. Payment orders, QR, transactions, refund, outbox webhook
-- =========================================================

INSERT INTO payment_orders (id, merchant_id, payment_no, merchant_order_id, amount, currency, callback_url, redirect_url, description, status, refund_status, refunded_amount, idempotency_key, metadata, expired_at, paid_at, canceled_at, failed_reason, created_at, updated_at)
VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'PAY000001', 'AM-ORDER-20260620-0001', 320000, 'VND', 'https://merchant.alpha-mart.test/webhooks/demopay', 'https://merchant.alpha-mart.test/payment/result?order=AM-ORDER-20260620-0001', 'Thanh toan don hang tra sua va banh ngot', 'PAID', 'PARTIALLY_REFUNDED', 100000, 'idem-merchant-create-payment-0001', '{"store_code":"STORE-ALPHA-ONLINE","cashier":"cashier.alpha","line_items":[{"sku":"SKU-TEA-001","name":"Tra sua tran chau size M","qty":1,"price":120000},{"sku":"SKU-CAKE-001","name":"Banh ngot vi chocolate","qty":1,"price":180000},{"sku":"SERVICE-FEE","name":"Phi dich vu demo","qty":1,"price":20000}]}'::jsonb, '2026-06-20 10:15:00+07', '2026-06-20 10:08:00+07', NULL, NULL, '2026-06-20 10:00:00+07', '2026-06-20 11:20:00+07'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'PAY000002', 'BC-ORDER-20260620-0002', 95000, 'VND', 'https://beta-coffee.test/webhooks/demopay', 'https://beta-coffee.test/payment/result?order=BC-ORDER-20260620-0002', 'Thanh toan Ca phe sua da size L tai chi nhanh District 7', 'PENDING', 'NONE', 0, 'idem-merchant-create-payment-0002', '{"store_code":"STORE-BETA-COFFEE","cashier":"staff.beta","line_items":[{"sku":"SKU-COFFEE-001","name":"Ca phe sua da size L","qty":1,"price":95000}]}'::jsonb, '2026-12-31 23:59:59+07', NULL, NULL, NULL, '2026-06-20 11:00:00+07', '2026-06-20 11:00:00+07'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'PAY000003', 'AM-ORDER-20260619-0003', 180000, 'VND', 'https://merchant.alpha-mart.test/webhooks/demopay', 'https://merchant.alpha-mart.test/payment/result?order=AM-ORDER-20260619-0003', 'Payment het han do khach khong xac nhan', 'EXPIRED', 'NONE', 0, 'idem-merchant-create-payment-0003', '{"store_code":"STORE-ALPHA-ONLINE","line_items":[{"sku":"SKU-CAKE-001","name":"Banh ngot vi chocolate","qty":1,"price":180000}]}'::jsonb, '2026-06-19 15:15:00+07', NULL, NULL, NULL, '2026-06-19 15:00:00+07', '2026-06-19 15:15:00+07'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', 'PAY000004', 'AM-ORDER-20260620-0004', 750000, 'VND', 'https://merchant.alpha-mart.test/webhooks/demopay', 'https://merchant.alpha-mart.test/payment/result?order=AM-ORDER-20260620-0004', 'Thanh toan giao hang nhanh nhung user khong du so du', 'FAILED', 'NONE', 0, 'idem-merchant-create-payment-0004', '{"store_code":"STORE-ALPHA-ONLINE","line_items":[{"sku":"SERVICE-DELIVERY","name":"Phi giao hang nhanh noi thanh","qty":1,"price":750000}]}'::jsonb, '2026-06-20 12:15:00+07', NULL, NULL, 'INSUFFICIENT_BALANCE', '2026-06-20 12:00:00+07', '2026-06-20 12:05:00+07');

INSERT INTO payment_qr_codes (id, payment_order_id, qr_token, qr_payload, qr_image_url, status, expired_at, used_at, created_at, updated_at)
VALUES
  ('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'qr_tok_pay_000001_alpha_mart', 'ewalletdemo://qr-payments/qr_tok_pay_000001_alpha_mart', 'https://cdn.ewallet-demo.test/qr/PAY000001.png', 'USED', '2026-06-20 10:15:00+07', '2026-06-20 10:08:00+07', '2026-06-20 10:00:00+07', '2026-06-20 10:08:00+07'),
  ('41000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 'qr_tok_pay_000002_beta_coffee', 'ewalletdemo://qr-payments/qr_tok_pay_000002_beta_coffee', 'https://cdn.ewallet-demo.test/qr/PAY000002.png', 'ACTIVE', '2026-12-31 23:59:59+07', NULL, '2026-06-20 11:00:00+07', '2026-06-20 11:00:00+07'),
  ('41000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', 'qr_tok_pay_000003_expired', 'ewalletdemo://qr-payments/qr_tok_pay_000003_expired', 'https://cdn.ewallet-demo.test/qr/PAY000003.png', 'EXPIRED', '2026-06-19 15:15:00+07', NULL, '2026-06-19 15:00:00+07', '2026-06-19 15:15:00+07'),
  ('41000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 'qr_tok_pay_000004_failed', 'ewalletdemo://qr-payments/qr_tok_pay_000004_failed', 'https://cdn.ewallet-demo.test/qr/PAY000004.png', 'CANCELED', '2026-06-20 12:15:00+07', NULL, '2026-06-20 12:00:00+07', '2026-06-20 12:05:00+07');

INSERT INTO payment_transactions (id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency, idempotency_key, status, failure_reason, paid_at, created_at, updated_at)
VALUES
  ('42000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 320000, 'VND', 'idem-user-confirm-payment-0001', 'SUCCESS', NULL, '2026-06-20 10:08:00+07', '2026-06-20 10:07:45+07', '2026-06-20 10:08:00+07'),
  ('42000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000104', 750000, 'VND', 'idem-user-confirm-payment-0004', 'FAILED', 'INSUFFICIENT_BALANCE', NULL, '2026-06-20 12:04:30+07', '2026-06-20 12:05:00+07');

INSERT INTO refund_transactions (id, refund_no, payment_order_id, payment_transaction_id, merchant_id, user_id, wallet_id, amount, currency, description, status, idempotency_key, failure_reason, created_by, refunded_at, created_at, updated_at)
VALUES
  ('43000000-0000-0000-0000-000000000001', 'RFD000001', '40000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 100000, 'VND', 'Hoan tien mot phan do khach doi san pham', 'SUCCESS', 'idem-refund-payment-0001', NULL, '10000000-0000-0000-0000-000000000004', '2026-06-20 11:20:00+07', '2026-06-20 11:18:00+07', '2026-06-20 11:20:00+07');

INSERT INTO outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at)
VALUES
  ('44000000-0000-0000-0000-000000000001', 'PAYMENT_ORDER', '40000000-0000-0000-0000-000000000001', 'PAYMENT_SUCCESS', '{"event_id":"CBK000001","event_type":"PAYMENT_SUCCESS","payment_no":"PAY000001","merchant_order_id":"AM-ORDER-20260620-0001","amount":320000,"currency":"VND","status":"PAID","transaction_no":"TXN000007","paid_at":"2026-06-20T10:08:00+07:00"}'::jsonb, 'SUCCESS', '2026-06-20 10:08:05+07'),
  ('44000000-0000-0000-0000-000000000002', 'REFUND_TRANSACTION', '43000000-0000-0000-0000-000000000001', 'REFUND_SUCCESS', '{"event_id":"CBK000002","event_type":"REFUND_SUCCESS","refund_no":"RFD000001","payment_no":"PAY000001","merchant_order_id":"AM-ORDER-20260620-0001","amount":100000,"currency":"VND","status":"SUCCESS","transaction_no":"TXN000008","refunded_at":"2026-06-20T11:20:00+07:00"}'::jsonb, 'PENDING', '2026-06-20 11:20:05+07'),
  ('44000000-0000-0000-0000-000000000003', 'PAYMENT_ORDER', '40000000-0000-0000-0000-000000000003', 'PAYMENT_EXPIRED', '{"event_id":"CBK000003","event_type":"PAYMENT_EXPIRED","payment_no":"PAY000003","merchant_order_id":"AM-ORDER-20260619-0003","amount":180000,"currency":"VND","status":"EXPIRED"}'::jsonb, 'FAILED', '2026-06-19 15:15:05+07');

-- =========================================================
-- 9. Ledger transactions and entries
-- =========================================================

INSERT INTO ledger_transactions (id, transaction_no, transaction_type, status, amount, currency, source_type, source_id, idempotency_key, description, created_by, completed_at, created_at, updated_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'TXN000001', 'TOPUP', 'SUCCESS', 5000000, 'VND', 'DEPOSIT_TRANSACTION', '60000000-0000-0000-0000-000000000001', 'idem-topup-an-0001', 'Nap tien vi Nguyen Thi An', '10000000-0000-0000-0000-000000000101', '2026-06-20 08:05:00+07', '2026-06-20 08:04:30+07', '2026-06-20 08:05:00+07'),
  ('50000000-0000-0000-0000-000000000002', 'TXN000002', 'TOPUP', 'SUCCESS', 2500000, 'VND', 'DEPOSIT_TRANSACTION', '60000000-0000-0000-0000-000000000002', 'idem-topup-binh-0001', 'Nap tien vi Tran Minh Binh', '10000000-0000-0000-0000-000000000102', '2026-06-20 08:15:00+07', '2026-06-20 08:14:40+07', '2026-06-20 08:15:00+07'),
  ('50000000-0000-0000-0000-000000000003', 'TXN000003', 'TOPUP', 'SUCCESS', 1200000, 'VND', 'DEPOSIT_TRANSACTION', '60000000-0000-0000-0000-000000000003', 'idem-topup-chi-0001', 'Nap tien vi Le Thanh Chi', '10000000-0000-0000-0000-000000000103', '2026-06-20 08:25:00+07', '2026-06-20 08:24:20+07', '2026-06-20 08:25:00+07'),
  ('50000000-0000-0000-0000-000000000004', 'TXN000004', 'TOPUP', 'SUCCESS', 300000, 'VND', 'DEPOSIT_TRANSACTION', '60000000-0000-0000-0000-000000000004', 'idem-topup-dung-0001', 'Nap tien vi Pham Quoc Dung', '10000000-0000-0000-0000-000000000104', '2026-06-20 08:35:00+07', '2026-06-20 08:34:30+07', '2026-06-20 08:35:00+07'),
  ('50000000-0000-0000-0000-000000000005', 'TXN000005', 'TRANSFER', 'SUCCESS', 450000, 'VND', 'WALLET_TRANSFER', '61000000-0000-0000-0000-000000000001', 'idem-transfer-an-binh-0001', 'An chuyen tien cho Binh', '10000000-0000-0000-0000-000000000101', '2026-06-20 09:10:00+07', '2026-06-20 09:09:40+07', '2026-06-20 09:10:00+07'),
  ('50000000-0000-0000-0000-000000000006', 'TXN000006', 'TRANSFER', 'SUCCESS', 180000, 'VND', 'WALLET_TRANSFER', '61000000-0000-0000-0000-000000000002', 'idem-transfer-binh-chi-0001', 'Binh chuyen tien cho Chi', '10000000-0000-0000-0000-000000000102', '2026-06-20 09:25:00+07', '2026-06-20 09:24:40+07', '2026-06-20 09:25:00+07'),
  ('50000000-0000-0000-0000-000000000007', 'TXN000007', 'PAYMENT', 'SUCCESS', 320000, 'VND', 'PAYMENT_TRANSACTION', '42000000-0000-0000-0000-000000000001', 'idem-user-confirm-payment-0001', 'Thanh toan Alpha Mart Online PAY000001', '10000000-0000-0000-0000-000000000101', '2026-06-20 10:08:00+07', '2026-06-20 10:07:45+07', '2026-06-20 10:08:00+07'),
  ('50000000-0000-0000-0000-000000000008', 'TXN000008', 'REFUND', 'SUCCESS', 100000, 'VND', 'REFUND_TRANSACTION', '43000000-0000-0000-0000-000000000001', 'idem-refund-payment-0001', 'Hoan tien mot phan PAY000001', '10000000-0000-0000-0000-000000000004', '2026-06-20 11:20:00+07', '2026-06-20 11:18:00+07', '2026-06-20 11:20:00+07');

INSERT INTO ledger_entries (id, ledger_transaction_id, account_type, wallet_id, merchant_id, system_account_code, entry_type, amount, balance_before, balance_after, description, created_at)
VALUES
  ('51000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'SYSTEM_ACCOUNT', NULL, NULL, 'SYSTEM_TOPUP_ACCOUNT', 'DEBIT', 5000000, 0, -5000000, 'Nguon tien sandbox topup', '2026-06-20 08:05:00+07'),
  ('51000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 'USER_WALLET', '20000000-0000-0000-0000-000000000101', NULL, NULL, 'CREDIT', 5000000, 0, 5000000, 'Cong tien vao vi WAL000101', '2026-06-20 08:05:00+07'),
  ('51000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'SYSTEM_ACCOUNT', NULL, NULL, 'SYSTEM_TOPUP_ACCOUNT', 'DEBIT', 2500000, -5000000, -7500000, 'Nguon tien sandbox topup', '2026-06-20 08:15:00+07'),
  ('51000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 'USER_WALLET', '20000000-0000-0000-0000-000000000102', NULL, NULL, 'CREDIT', 2500000, 0, 2500000, 'Cong tien vao vi WAL000102', '2026-06-20 08:15:00+07'),
  ('51000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', 'SYSTEM_ACCOUNT', NULL, NULL, 'SYSTEM_TOPUP_ACCOUNT', 'DEBIT', 1200000, -7500000, -8700000, 'Nguon tien sandbox topup', '2026-06-20 08:25:00+07'),
  ('51000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000003', 'USER_WALLET', '20000000-0000-0000-0000-000000000103', NULL, NULL, 'CREDIT', 1200000, 0, 1200000, 'Cong tien vao vi WAL000103', '2026-06-20 08:25:00+07'),
  ('51000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000004', 'SYSTEM_ACCOUNT', NULL, NULL, 'SYSTEM_TOPUP_ACCOUNT', 'DEBIT', 300000, -8700000, -9000000, 'Nguon tien sandbox topup', '2026-06-20 08:35:00+07'),
  ('51000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000004', 'USER_WALLET', '20000000-0000-0000-0000-000000000104', NULL, NULL, 'CREDIT', 300000, 0, 300000, 'Cong tien vao vi WAL000104', '2026-06-20 08:35:00+07'),
  ('51000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000005', 'USER_WALLET', '20000000-0000-0000-0000-000000000101', NULL, NULL, 'DEBIT', 450000, 5000000, 4550000, 'Tru vi nguoi gui An', '2026-06-20 09:10:00+07'),
  ('51000000-0000-0000-0000-000000000010', '50000000-0000-0000-0000-000000000005', 'USER_WALLET', '20000000-0000-0000-0000-000000000102', NULL, NULL, 'CREDIT', 450000, 2500000, 2950000, 'Cong vi nguoi nhan Binh', '2026-06-20 09:10:00+07'),
  ('51000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000006', 'USER_WALLET', '20000000-0000-0000-0000-000000000102', NULL, NULL, 'DEBIT', 180000, 2950000, 2770000, 'Tru vi nguoi gui Binh', '2026-06-20 09:25:00+07'),
  ('51000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000006', 'USER_WALLET', '20000000-0000-0000-0000-000000000103', NULL, NULL, 'CREDIT', 180000, 1200000, 1380000, 'Cong vi nguoi nhan Chi', '2026-06-20 09:25:00+07'),
  ('51000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000007', 'USER_WALLET', '20000000-0000-0000-0000-000000000101', NULL, NULL, 'DEBIT', 320000, 4550000, 4230000, 'Tru vi user thanh toan PAY000001', '2026-06-20 10:08:00+07'),
  ('51000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000007', 'MERCHANT_BALANCE', NULL, '30000000-0000-0000-0000-000000000001', NULL, 'CREDIT', 320000, 0, 320000, 'Cong merchant balance Alpha Mart Online', '2026-06-20 10:08:00+07'),
  ('51000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000008', 'MERCHANT_BALANCE', NULL, '30000000-0000-0000-0000-000000000001', NULL, 'DEBIT', 100000, 320000, 220000, 'Tru merchant balance khi hoan tien', '2026-06-20 11:20:00+07'),
  ('51000000-0000-0000-0000-000000000016', '50000000-0000-0000-0000-000000000008', 'USER_WALLET', '20000000-0000-0000-0000-000000000101', NULL, NULL, 'CREDIT', 100000, 4230000, 4330000, 'Cong tien hoan vao vi WAL000101', '2026-06-20 11:20:00+07');

-- =========================================================
-- 10. Idempotency keys, tokens, OTP, notifications, chat
-- =========================================================

INSERT INTO idempotency_keys (id, actor_type, actor_id, idempotency_key, request_path, request_hash, resource_type, resource_id, response_status_code, response_body, status, locked_at, expires_at, created_at, updated_at)
VALUES
  ('70000000-0000-0000-0000-000000000001', 'USER', '10000000-0000-0000-0000-000000000101', 'idem-topup-an-0001', '/api/v1/topups', 'sha256:req-topup-an-0001', 'DEPOSIT_TRANSACTION', '60000000-0000-0000-0000-000000000001', 200, '{"deposit_no":"DPT000001","status":"SUCCESS","amount":5000000}'::jsonb, 'COMPLETED', '2026-06-20 08:04:30+07', '2026-06-21 08:04:30+07', '2026-06-20 08:04:30+07', '2026-06-20 08:05:00+07'),
  ('70000000-0000-0000-0000-000000000002', 'USER', '10000000-0000-0000-0000-000000000101', 'idem-transfer-an-binh-0001', '/api/v1/transfers', 'sha256:req-transfer-an-binh-0001', 'WALLET_TRANSFER', '61000000-0000-0000-0000-000000000001', 200, '{"transfer_no":"TRF000001","status":"SUCCESS","amount":450000}'::jsonb, 'COMPLETED', '2026-06-20 09:09:40+07', '2026-06-21 09:09:40+07', '2026-06-20 09:09:40+07', '2026-06-20 09:10:00+07'),
  ('70000000-0000-0000-0000-000000000003', 'MERCHANT', '30000000-0000-0000-0000-000000000001', 'idem-merchant-create-payment-0001', '/api/v1/merchant/payments', 'sha256:req-merchant-create-payment-0001', 'PAYMENT_ORDER', '40000000-0000-0000-0000-000000000001', 200, '{"payment_no":"PAY000001","status":"PENDING","amount":320000}'::jsonb, 'COMPLETED', '2026-06-20 10:00:00+07', '2026-06-21 10:00:00+07', '2026-06-20 10:00:00+07', '2026-06-20 10:00:01+07'),
  ('70000000-0000-0000-0000-000000000004', 'USER', '10000000-0000-0000-0000-000000000101', 'idem-user-confirm-payment-0001', '/api/v1/qr-payments/qr_tok_pay_000001_alpha_mart/confirm', 'sha256:req-confirm-payment-0001', 'PAYMENT_TRANSACTION', '42000000-0000-0000-0000-000000000001', 200, '{"payment_no":"PAY000001","status":"PAID","transaction_no":"TXN000007"}'::jsonb, 'COMPLETED', '2026-06-20 10:07:45+07', '2026-06-21 10:07:45+07', '2026-06-20 10:07:45+07', '2026-06-20 10:08:00+07'),
  ('70000000-0000-0000-0000-000000000005', 'MERCHANT', '30000000-0000-0000-0000-000000000001', 'idem-refund-payment-0001', '/api/v1/merchant/refunds', 'sha256:req-refund-payment-0001', 'REFUND_TRANSACTION', '43000000-0000-0000-0000-000000000001', 200, '{"refund_no":"RFD000001","status":"SUCCESS","amount":100000}'::jsonb, 'COMPLETED', '2026-06-20 11:18:00+07', '2026-06-21 11:18:00+07', '2026-06-20 11:18:00+07', '2026-06-20 11:20:00+07');

INSERT INTO refresh_tokens (id, user_id, token_hash, token_family_id, expires_at, revoked_at, reused_at, created_at, created_by_ip, revoked_by_ip, user_agent)
VALUES
  ('71000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'sha256:demo-refresh-superadmin-0001', '71000000-0000-0000-0000-000000000101', '2026-06-27 08:10:00+07', NULL, NULL, '2026-06-20 08:10:00+07', '127.0.0.1', NULL, 'PostmanRuntime/7.43.0'),
  ('71000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000101', 'sha256:demo-refresh-user-an-0001', '71000000-0000-0000-0000-000000000102', '2026-06-27 09:00:00+07', NULL, NULL, '2026-06-20 09:00:00+07', '127.0.0.1', NULL, 'EWalletDemoMobile/1.0 iOS');

INSERT INTO otp_tracking (id, phone, email, otp_hash, purpose, failed_attempts, locked_until, expired_at, used_at, created_at)
VALUES
  ('72000000-0000-0000-0000-000000000001', '0911000001', 'an@customer.test', 'sha256:demo-otp-used-0001', 'AUTH', 0, NULL, '2026-06-20 09:05:00+07', '2026-06-20 09:00:10+07', '2026-06-20 09:00:00+07'),
  ('72000000-0000-0000-0000-000000000002', '0911000005', 'giang@customer.test', 'sha256:demo-otp-failed-0002', 'AUTH', 3, '2026-06-21 08:00:00+07', '2026-06-20 08:05:00+07', NULL, '2026-06-20 08:00:00+07');

INSERT INTO notifications (id, user_id, title, content, notification_type, reference_id, status, read_at, created_at, updated_at)
VALUES
  ('73000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101', 'Nap tien thanh cong', 'Vi WAL000101 da duoc cong 5.000.000 VND.', 'TOPUP_SUCCESS', '60000000-0000-0000-0000-000000000001', 'READ', '2026-06-20 08:06:00+07', '2026-06-20 08:05:05+07', '2026-06-20 08:06:00+07'),
  ('73000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000101', 'Thanh toan thanh cong', 'Ban da thanh toan 320.000 VND cho Alpha Mart Online.', 'PAYMENT_SUCCESS', '40000000-0000-0000-0000-000000000001', 'READ', '2026-06-20 10:09:00+07', '2026-06-20 10:08:05+07', '2026-06-20 10:09:00+07'),
  ('73000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000101', 'Hoan tien thanh cong', 'Ban da duoc hoan 100.000 VND tu giao dich PAY000001.', 'REFUND_SUCCESS', '43000000-0000-0000-0000-000000000001', 'UNREAD', NULL, '2026-06-20 11:20:05+07', '2026-06-20 11:20:05+07'),
  ('73000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000102', 'Nhan tien thanh cong', 'Ban da nhan 450.000 VND tu Nguyen Thi An.', 'TRANSFER_RECEIVED', '61000000-0000-0000-0000-000000000001', 'READ', '2026-06-20 09:11:00+07', '2026-06-20 09:10:05+07', '2026-06-20 09:11:00+07'),
  ('73000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000104', 'Thanh toan that bai', 'Vi khong du so du de thanh toan 750.000 VND cho Alpha Mart Online.', 'PAYMENT_FAILED', '40000000-0000-0000-0000-000000000004', 'UNREAD', NULL, '2026-06-20 12:05:05+07', '2026-06-20 12:05:05+07');

INSERT INTO chat_messages (id, sender_wallet_id, receiver_wallet_id, content, message_type, status, created_at, updated_at)
VALUES
  ('74000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000102', 'Minh chuyen truoc 450k tien an uong nhe.', 'TEXT', 'READ', '2026-06-20 09:08:00+07', '2026-06-20 09:10:30+07'),
  ('74000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000101', 'Nhan duoc roi, lat minh check QR thanh toan.', 'TEXT', 'READ', '2026-06-20 09:11:00+07', '2026-06-20 09:11:30+07');

-- =========================================================
-- 11. Group funding demo: split bill dang hoat dong
-- =========================================================

INSERT INTO group_fundings (id, creator_user_id, creator_wallet_id, type, total_amount, remaining_amount, total_count, remaining_count, status, message, expires_at, created_at, updated_at)
VALUES
  ('75000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000102', '20000000-0000-0000-0000-000000000102', 'SPLIT_BILL', 600000, 200000, 3, 1, 'ACTIVE', 'Chia tien an uong cuoi tuan', '2026-06-30 23:59:59+07', '2026-06-20 13:00:00+07', '2026-06-20 13:05:00+07');

INSERT INTO group_funding_members (id, group_funding_id, user_id, wallet_id, amount, status, paid_at, created_at)
VALUES
  ('75100000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000101', '20000000-0000-0000-0000-000000000101', 200000, 'PAID', '2026-06-20 13:02:00+07', '2026-06-20 13:00:00+07'),
  ('75100000-0000-0000-0000-000000000002', '75000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000103', '20000000-0000-0000-0000-000000000103', 200000, 'PAID', '2026-06-20 13:03:00+07', '2026-06-20 13:00:00+07'),
  ('75100000-0000-0000-0000-000000000003', '75000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000104', '20000000-0000-0000-0000-000000000104', 200000, 'PENDING', NULL, '2026-06-20 13:00:00+07');

-- =========================================================
-- 12. Basic validation queries for manual check
-- =========================================================

-- Tong vi sau seed
-- SELECT w.wallet_no, u.full_name, wb.available_balance, wb.locked_balance
-- FROM wallets w JOIN users u ON u.id = w.user_id JOIN wallet_balances wb ON wb.wallet_id = w.id
-- ORDER BY w.wallet_no;

-- Kiem tra can bang debit/credit theo ledger transaction
-- SELECT lt.transaction_no,
--        SUM(CASE WHEN le.entry_type = 'DEBIT' THEN le.amount ELSE 0 END) AS total_debit,
--        SUM(CASE WHEN le.entry_type = 'CREDIT' THEN le.amount ELSE 0 END) AS total_credit
-- FROM ledger_transactions lt
-- JOIN ledger_entries le ON le.ledger_transaction_id = lt.id
-- GROUP BY lt.transaction_no
-- ORDER BY lt.transaction_no;

COMMIT;

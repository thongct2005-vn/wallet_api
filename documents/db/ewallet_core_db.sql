--
-- PostgreSQL database dump
--

\restrict QjArrkLPH4IZMbO2eJS1hV9B5jowDSe8akxFMp4qmfCDtMCaKb1QXo2bBLWUTJ5

-- Dumped from database version 17.10
-- Dumped by pg_dump version 17.10

-- Started on 2026-06-22 14:43:54

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 983 (class 1247 OID 35558)
-- Name: group_funding_type; Type: TYPE; Schema: public; Owner: postgres
--



--27/06/2026
ALTER TABLE ledger_transactions ADD COLUMN metadata JSONB;


ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_force_change_password BOOLEAN NOT NULL DEFAULT FALSE, -- Bắt đổi mật khẩu lần đầu
ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ NULL, -- Hạn dùng mật khẩu tạm
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL; -- Thời điểm đổi mật khẩu gần nhất

-- 1. Thêm 2 permission mới
INSERT INTO public.permissions (id, code, name, description)
VALUES
(
  '02000000-0000-0000-0000-000000000044',
  'admin.customers.create',
  'Admin create customers',
  'Admin tao khach hang dung vi'
),
(
  '02000000-0000-0000-0000-000000000045',
  'admin.staffs.create',
  'Admin create staffs',
  'Admin tao nhan vien noi bo'
)
ON CONFLICT (code) DO NOTHING;
INSERT INTO public.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, NOW()
FROM public.roles r
JOIN public.permissions p
  ON p.code IN ('admin.customers.create', 'admin.staffs.create')
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
AND NOT EXISTS (
  SELECT 1
  FROM public.role_permissions rp
  WHERE rp.role_id = r.id
    AND rp.permission_id = p.id
);


--27/06/2026
ADD COLUMN IF NOT EXISTS is_force_change_password BOOLEAN NOT NULL DEFAULT FALSE, -- Bắt đổi mật khẩu lần đầu
ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ NULL, -- Hạn dùng mật khẩu tạm
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ NULL; -- Thời điểm đổi mật khẩu gần nhất

ALTER TABLE ledger_transactions ADD COLUMN metadata JSONB;

 ALTER TABLE public.wallet_balances 
ADD COLUMN IF NOT EXISTS loyalty_points BIGINT NOT NULL DEFAULT 0;

--26/06/2026
ALTER TABLE idempotency_keys 
ADD CONSTRAINT uq_idempotency_key UNIQUE (idempotency_key);

ALTER TABLE payment_orders ALTER COLUMN merchant_id DROP NOT NULL
ALTER TABLE payment_orders ALTER COLUMN callback_url DROP NOT NULL
ALTER TABLE payment_orders ALTER COLUMN merchant_order_id DROP NOT NULL

--24/06/2026 
CREATE TABLE IF NOT EXISTS fee_configs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                fee_code VARCHAR(50) UNIQUE NOT NULL,
                fee_type VARCHAR(20) NOT NULL,
                fee_value NUMERIC NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
ALTER TABLE fee_configs 
ADD CONSTRAINT chk_fee_value_positive CHECK (fee_value >= 0);
-- =========================================================
-- 1. ENUM TYPES
-- =========================================================

CREATE TYPE user_type AS ENUM ('USER', 'MERCHANT_USER', 'ADMIN', 'SUPER_ADMIN', 'SUPPORT_STAFF');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'PENDING_VERIFY', 'LOCKED', 'BLOCKED', 'INACTIVE');

CREATE TYPE role_scope AS ENUM ('SYSTEM', 'MERCHANT');

CREATE TYPE wallet_status AS ENUM ('ACTIVE', 'LOCKED', 'CLOSED');
CREATE TYPE wallet_type AS ENUM ('PERSONAL');

CREATE TYPE ledger_transaction_type AS ENUM ('TOPUP', 'TRANSFER', 'PAYMENT', 'REFUND', 'WITHDRAWAL', 'ADJUSTMENT', 'BANK_TRANSFER', 'DEPOSIT', 'WITHDRAW');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED');
CREATE TYPE ledger_entry_type AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE ledger_account_type AS ENUM ('USER_WALLET', 'MERCHANT_BALANCE', 'SYSTEM_ACCOUNT', 'PERSONAL');

CREATE TYPE deposit_method AS ENUM ('SANDBOX_BANK', 'SANDBOX_CARD');
CREATE TYPE transfer_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED');
CREATE TYPE deposit_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED');
CREATE TYPE withdrawal_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED');

CREATE TYPE merchant_status AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'CLOSED');
CREATE TYPE business_type AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');
CREATE TYPE api_key_status AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE api_environment AS ENUM ('SANDBOX', 'LIVE');

CREATE TYPE payment_order_status AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELED', 'FAILED');
CREATE TYPE payment_transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE payment_refund_status AS ENUM ('NONE', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED');
CREATE TYPE qr_status AS ENUM ('ACTIVE', 'USED', 'EXPIRED', 'CANCELED');

CREATE TYPE refund_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELED');

CREATE TYPE webhook_event_type AS ENUM (
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'PAYMENT_EXPIRED',
    'PAYMENT_CANCELED',
    'REFUND_SUCCESS',
    'REFUND_FAILED'
);
CREATE TYPE webhook_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRYING');

CREATE TYPE idempotency_actor_type AS ENUM ('USER', 'MERCHANT', 'ADMIN', 'SYSTEM');
CREATE TYPE idempotency_status AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

CREATE TYPE log_level AS ENUM ('INFO', 'WARN', 'ERROR', 'CRITICAL');
CREATE TYPE audit_actor_type AS ENUM ('USER', 'MERCHANT', 'ADMIN', 'SYSTEM');

CREATE TYPE setting_value_type AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'JSON');


CREATE TYPE public.group_funding_type AS ENUM (
    'SPLIT_BILL',
    'RED_PACKET'
);

ALTER TYPE public.group_funding_type OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 246 (class 1259 OID 35269)
-- Name: app_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_settings (
    id uuid NOT NULL,
    setting_group character varying(100) NOT NULL,
    setting_key character varying(150) NOT NULL,
    setting_value jsonb NOT NULL,
    value_type character varying(50) DEFAULT 'STRING'::character varying NOT NULL,
    description text,
    is_sensitive boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_settings OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 35304)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid NOT NULL,
    sender_wallet_id uuid NOT NULL,
    receiver_wallet_id uuid NOT NULL,
    content text NOT NULL,
    message_type character varying(20) DEFAULT 'TEXT'::character varying,
    status character varying(20) DEFAULT 'SENT'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 35282)
-- Name: code_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.code_sequences (
    id uuid NOT NULL,
    resource_name character varying(100) NOT NULL,
    prefix character varying(20) NOT NULL,
    current_value bigint DEFAULT 0 NOT NULL,
    padding integer DEFAULT 6 NOT NULL,
    reset_policy character varying(20) DEFAULT 'NONE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.code_sequences OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 35215)
-- Name: deposit_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deposit_transactions (
    id uuid NOT NULL,
    deposit_no character varying(50) NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    deposit_method character varying(50) DEFAULT 'SANDBOX_BANK'::character varying NOT NULL,
    external_reference character varying(255),
    idempotency_key character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    failure_reason text,
    description text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.deposit_transactions OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 35573)
-- Name: group_funding_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_funding_members (
    id uuid NOT NULL,
    group_funding_id uuid NOT NULL,
    user_id uuid,
    wallet_id uuid,
    amount bigint NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.group_funding_members OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 35563)
-- Name: group_fundings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_fundings (
    id uuid NOT NULL,
    creator_user_id uuid,
    creator_wallet_id uuid,
    type public.group_funding_type NOT NULL,
    total_amount bigint NOT NULL,
    remaining_amount bigint NOT NULL,
    total_count integer NOT NULL,
    remaining_count integer NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    message text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.group_fundings OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 35159)
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.idempotency_keys (
    id uuid NOT NULL,
    actor_type character varying(50) NOT NULL,
    actor_id uuid NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    request_path character varying(255) NOT NULL,
    request_hash text NOT NULL,
    resource_type character varying(100),
    resource_id uuid,
    response_status_code integer,
    response_body jsonb,
    status character varying(50) DEFAULT 'PROCESSING'::character varying NOT NULL,
    locked_at timestamp with time zone,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.idempotency_keys OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 35151)
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_entries (
    id uuid NOT NULL,
    ledger_transaction_id uuid NOT NULL,
    account_type character varying(50) NOT NULL,
    wallet_id uuid,
    merchant_id uuid,
    system_account_code character varying(50),
    entry_type character varying(50) NOT NULL,
    amount bigint NOT NULL,
    balance_before bigint NOT NULL,
    balance_after bigint NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ledger_entries OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 35138)
-- Name: ledger_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ledger_transactions (
    id uuid NOT NULL,
    transaction_no character varying(50) NOT NULL,
    transaction_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    source_type character varying(50),
    source_id uuid,
    idempotency_key character varying(255),
    description text,
    created_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.ledger_transactions OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 35069)
-- Name: merchant_api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchant_api_keys (
    id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    key_name character varying(100) NOT NULL,
    api_key character varying(255) NOT NULL,
    api_secret_hash text NOT NULL,
    environment character varying(50) DEFAULT 'SANDBOX'::character varying NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    last_used_at timestamp with time zone,
    expired_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.merchant_api_keys OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 35095)
-- Name: merchant_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchant_balances (
    merchant_id uuid NOT NULL,
    available_balance bigint DEFAULT 0 NOT NULL,
    pending_balance bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.merchant_balances OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 35082)
-- Name: merchant_callback_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchant_callback_configs (
    id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    default_callback_url text NOT NULL,
    default_redirect_url text,
    webhook_secret_hash text NOT NULL,
    callback_enabled boolean DEFAULT true NOT NULL,
    retry_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.merchant_callback_configs OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 35057)
-- Name: merchant_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchant_users (
    id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_code character varying(100) DEFAULT 'MERCHANT_STAFF'::character varying NOT NULL,
    is_owner boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.merchant_users OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 35042)
-- Name: merchants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.merchants (
    id uuid NOT NULL,
    merchant_code character varying(50) NOT NULL,
    merchant_name character varying(255) NOT NULL,
    business_type character varying(50) DEFAULT 'ONLINE'::character varying NOT NULL,
    representative_name character varying(255),
    tax_code character varying(50),
    phone character varying(20),
    email character varying(255),
    address text,
    status character varying(50) DEFAULT 'PENDING_REVIEW'::character varying NOT NULL,
    risk_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.merchants OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 35294)
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    notification_type character varying(50),
    reference_id uuid,
    status character varying(20) DEFAULT 'UNREAD'::character varying NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 35022)
-- Name: otp_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp_tracking (
    id uuid NOT NULL,
    phone character varying(20),
    email character varying(255),
    otp_hash text NOT NULL,
    purpose character varying(50) DEFAULT 'AUTH'::character varying NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    expired_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.otp_tracking OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 34924)
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outbox_events (
    id uuid NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.outbox_events OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 35032)
-- Name: password_resets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_resets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    reset_token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address character varying(45),
    user_agent character varying(500)
);


ALTER TABLE public.password_resets OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 35171)
-- Name: payment_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_orders (
    id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    payment_no character varying(50) NOT NULL,
    merchant_order_id character varying(100) NOT NULL,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    callback_url text NOT NULL,
    redirect_url text,
    description text,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    refund_status character varying(50) DEFAULT 'NONE'::character varying NOT NULL,
    refunded_amount bigint DEFAULT 0 NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    metadata jsonb,
    expired_at timestamp with time zone NOT NULL,
    paid_at timestamp with time zone,
    canceled_at timestamp with time zone,
    failed_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_orders OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 35203)
-- Name: payment_qr_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_qr_codes (
    id uuid NOT NULL,
    payment_order_id uuid NOT NULL,
    qr_token character varying(255) NOT NULL,
    qr_payload text NOT NULL,
    qr_image_url text,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    expired_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_qr_codes OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 35190)
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_transactions (
    id uuid NOT NULL,
    payment_order_id uuid NOT NULL,
    payer_user_id uuid NOT NULL,
    payer_wallet_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    failure_reason text,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_transactions OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 34981)
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid NOT NULL,
    code character varying(150) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 35012)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_hash text NOT NULL,
    token_family_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    reused_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_ip character varying(45),
    revoked_by_ip character varying(45),
    user_agent character varying(500)
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 35256)
-- Name: refund_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refund_transactions (
    id uuid NOT NULL,
    refund_no character varying(50) NOT NULL,
    payment_order_id uuid NOT NULL,
    payment_transaction_id uuid,
    merchant_id uuid NOT NULL,
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    description character varying(500) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    failure_reason text,
    created_by uuid,
    refunded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refund_transactions OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 34997)
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 34967)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    scope character varying(50) DEFAULT 'SYSTEM'::character varying NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 35003)
-- Name: user_devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_devices (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    fcm_token character varying(255) NOT NULL,
    device_name character varying(100),
    device_type character varying(20),
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_devices OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 34953)
-- Name: user_kyc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_kyc (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    id_number character varying(20),
    full_name character varying(255),
    dob character varying(20),
    gender character varying(10),
    address text,
    id_front_image text NOT NULL,
    id_back_image text NOT NULL,
    face_image text NOT NULL,
    kyc_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    face_match_score numeric,
    rejection_reason text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_kyc OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 34991)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 34933)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    user_type character varying(50) DEFAULT 'USER'::character varying NOT NULL,
    full_name character varying(255) NOT NULL,
    username character varying(100),
    email character varying(255),
    phone character varying(20),
    password_hash text NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    last_login_at timestamp with time zone,
    is_kyc_verified boolean DEFAULT false NOT NULL,
    pin_hash text,
    token_version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    loyalty_member_id character varying(255),
    email_otp character varying(10),
    email_otp_expired_at timestamp with time zone,
    is_force_change_password boolean DEFAULT false NOT NULL,
    temporary_password_expires_at timestamp with time zone,
    password_changed_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 35122)
-- Name: wallet_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_balances (
    wallet_id uuid NOT NULL,
    available_balance bigint DEFAULT 0 NOT NULL,
    locked_balance bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet_balances OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 35315)
-- Name: wallet_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_limits (
    wallet_id uuid NOT NULL,
    daily_deposit_limit bigint DEFAULT 50000000,
    daily_withdrawal_limit bigint DEFAULT 50000000,
    daily_transaction_limit bigint DEFAULT 50000000,
    monthly_transaction_limit bigint DEFAULT 100000000,
    monthly_special_service_limit bigint DEFAULT 300000000,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wallet_limits OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 35130)
-- Name: wallet_linked_banks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_linked_banks (
    id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    bank_name character varying(100) NOT NULL,
    bank_code character varying(20),
    card_number character varying(50) NOT NULL,
    card_holder_name character varying(255) NOT NULL,
    issue_date character varying(10),
    status character varying(20) DEFAULT 'ACTIVE'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet_linked_banks OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 35243)
-- Name: wallet_transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_transfers (
    id uuid NOT NULL,
    transfer_no character varying(50) NOT NULL,
    sender_user_id uuid NOT NULL,
    sender_wallet_id uuid NOT NULL,
    receiver_user_id uuid NOT NULL,
    receiver_wallet_id uuid NOT NULL,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    description character varying(255),
    idempotency_key character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    failure_reason text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallet_transfers OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 35103)
-- Name: wallets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallets (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    wallet_no character varying(50) NOT NULL,
    wallet_code character varying(50),
    wallet_type character varying(50) DEFAULT 'PERSONAL'::character varying NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    lock_reason text,
    locked_at timestamp with time zone,
    locked_by uuid,
    closed_at timestamp with time zone,
    pin_failed_attempts integer DEFAULT 0 NOT NULL,
    pin_locked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.wallets OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 35229)
-- Name: withdrawal_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.withdrawal_transactions (
    id uuid NOT NULL,
    withdrawal_no character varying(50),
    user_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    linked_bank_id uuid,
    amount bigint NOT NULL,
    currency character varying(10) DEFAULT 'VND'::character varying NOT NULL,
    withdrawal_method character varying(50) DEFAULT 'SANDBOX_BANK'::character varying NOT NULL,
    bank_code character varying(50),
    account_number character varying(100),
    external_reference character varying(255),
    idempotency_key character varying(255),
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    failure_reason text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.withdrawal_transactions OWNER TO postgres;

--
-- TOC entry 5365 (class 0 OID 35269)
-- Dependencies: 246
-- Data for Name: app_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_settings (id, setting_group, setting_key, setting_value, value_type, description, is_sensitive, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5368 (class 0 OID 35304)
-- Dependencies: 249
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, sender_wallet_id, receiver_wallet_id, content, message_type, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5366 (class 0 OID 35282)
-- Dependencies: 247
-- Data for Name: code_sequences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.code_sequences (id, resource_name, prefix, current_value, padding, reset_policy, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5361 (class 0 OID 35215)
-- Dependencies: 242
-- Data for Name: deposit_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deposit_transactions (id, deposit_no, user_id, wallet_id, amount, currency, deposit_method, external_reference, idempotency_key, status, failure_reason, description, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5371 (class 0 OID 35573)
-- Dependencies: 252
-- Data for Name: group_funding_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_funding_members (id, group_funding_id, user_id, wallet_id, amount, status, paid_at, created_at) FROM stdin;
\.


--
-- TOC entry 5370 (class 0 OID 35563)
-- Dependencies: 251
-- Data for Name: group_fundings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_fundings (id, creator_user_id, creator_wallet_id, type, total_amount, remaining_amount, total_count, remaining_count, status, message, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5357 (class 0 OID 35159)
-- Dependencies: 238
-- Data for Name: idempotency_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.idempotency_keys (id, actor_type, actor_id, idempotency_key, request_path, request_hash, resource_type, resource_id, response_status_code, response_body, status, locked_at, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5356 (class 0 OID 35151)
-- Dependencies: 237
-- Data for Name: ledger_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_entries (id, ledger_transaction_id, account_type, wallet_id, merchant_id, system_account_code, entry_type, amount, balance_before, balance_after, description, created_at) FROM stdin;
\.


--
-- TOC entry 5355 (class 0 OID 35138)
-- Dependencies: 236
-- Data for Name: ledger_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ledger_transactions (id, transaction_no, transaction_type, status, amount, currency, source_type, source_id, idempotency_key, description, created_by, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5349 (class 0 OID 35069)
-- Dependencies: 230
-- Data for Name: merchant_api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchant_api_keys (id, merchant_id, key_name, api_key, api_secret_hash, environment, status, last_used_at, expired_at, revoked_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5351 (class 0 OID 35095)
-- Dependencies: 232
-- Data for Name: merchant_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchant_balances (merchant_id, available_balance, pending_balance, updated_at) FROM stdin;
\.


--
-- TOC entry 5350 (class 0 OID 35082)
-- Dependencies: 231
-- Data for Name: merchant_callback_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchant_callback_configs (id, merchant_id, default_callback_url, default_redirect_url, webhook_secret_hash, callback_enabled, retry_enabled, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5348 (class 0 OID 35057)
-- Dependencies: 229
-- Data for Name: merchant_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchant_users (id, merchant_id, user_id, role_code, is_owner, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5347 (class 0 OID 35042)
-- Dependencies: 228
-- Data for Name: merchants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.merchants (id, merchant_code, merchant_name, business_type, representative_name, tax_code, phone, email, address, status, risk_note, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5367 (class 0 OID 35294)
-- Dependencies: 248
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, content, notification_type, reference_id, status, read_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5345 (class 0 OID 35022)
-- Dependencies: 226
-- Data for Name: otp_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otp_tracking (id, phone, email, otp_hash, purpose, failed_attempts, locked_until, expired_at, used_at, created_at) FROM stdin;
\.


--
-- TOC entry 5336 (class 0 OID 34924)
-- Dependencies: 217
-- Data for Name: outbox_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outbox_events (id, aggregate_type, aggregate_id, event_type, payload, status, created_at) FROM stdin;
\.


--
-- TOC entry 5346 (class 0 OID 35032)
-- Dependencies: 227
-- Data for Name: password_resets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_resets (id, user_id, reset_token_hash, expires_at, used_at, created_at, ip_address, user_agent) FROM stdin;
\.


--
-- TOC entry 5358 (class 0 OID 35171)
-- Dependencies: 239
-- Data for Name: payment_orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_orders (id, merchant_id, payment_no, merchant_order_id, amount, currency, callback_url, redirect_url, description, status, refund_status, refunded_amount, idempotency_key, metadata, expired_at, paid_at, canceled_at, failed_reason, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5360 (class 0 OID 35203)
-- Dependencies: 241
-- Data for Name: payment_qr_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_qr_codes (id, payment_order_id, qr_token, qr_payload, qr_image_url, status, expired_at, used_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5359 (class 0 OID 35190)
-- Dependencies: 240
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payment_transactions (id, payment_order_id, payer_user_id, payer_wallet_id, amount, currency, idempotency_key, status, failure_reason, paid_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5340 (class 0 OID 34981)
-- Dependencies: 221
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.permissions (id, code, name, description, created_at) FROM stdin;
\.


--
-- TOC entry 5344 (class 0 OID 35012)
-- Dependencies: 225
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, token_family_id, expires_at, revoked_at, reused_at, created_at, created_by_ip, revoked_by_ip, user_agent) FROM stdin;
\.


--
-- TOC entry 5364 (class 0 OID 35256)
-- Dependencies: 245
-- Data for Name: refund_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refund_transactions (id, refund_no, payment_order_id, payment_transaction_id, merchant_id, user_id, wallet_id, amount, currency, description, status, idempotency_key, failure_reason, created_by, refunded_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5342 (class 0 OID 34997)
-- Dependencies: 223
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role_permissions (role_id, permission_id, created_at) FROM stdin;
\.


--
-- TOC entry 5339 (class 0 OID 34967)
-- Dependencies: 220
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (id, code, name, scope, description, is_system, is_active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5343 (class 0 OID 35003)
-- Dependencies: 224
-- Data for Name: user_devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_devices (id, user_id, fcm_token, device_name, device_type, last_seen_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5338 (class 0 OID 34953)
-- Dependencies: 219
-- Data for Name: user_kyc; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_kyc (id, user_id, id_number, full_name, dob, gender, address, id_front_image, id_back_image, face_image, kyc_status, face_match_score, rejection_reason, reviewed_by, reviewed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5341 (class 0 OID 34991)
-- Dependencies: 222
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_id, created_at) FROM stdin;
\.


--
-- TOC entry 5337 (class 0 OID 34933)
-- Dependencies: 218
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, user_type, full_name, username, email, phone, password_hash, status, failed_login_attempts, locked_until, last_login_at, is_kyc_verified, pin_hash, token_version, created_at, updated_at, loyalty_member_id, email_otp, email_otp_expired_at) FROM stdin;
\.


--
-- TOC entry 5353 (class 0 OID 35122)
-- Dependencies: 234
-- Data for Name: wallet_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_balances (wallet_id, available_balance, locked_balance, updated_at) FROM stdin;
\.


--
-- TOC entry 5369 (class 0 OID 35315)
-- Dependencies: 250
-- Data for Name: wallet_limits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_limits (wallet_id, daily_deposit_limit, daily_withdrawal_limit, daily_transaction_limit, monthly_transaction_limit, monthly_special_service_limit, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5354 (class 0 OID 35130)
-- Dependencies: 235
-- Data for Name: wallet_linked_banks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_linked_banks (id, wallet_id, bank_name, bank_code, card_number, card_holder_name, issue_date, status, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5363 (class 0 OID 35243)
-- Dependencies: 244
-- Data for Name: wallet_transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_transfers (id, transfer_no, sender_user_id, sender_wallet_id, receiver_user_id, receiver_wallet_id, amount, currency, description, idempotency_key, status, failure_reason, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5352 (class 0 OID 35103)
-- Dependencies: 233
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallets (id, user_id, wallet_no, wallet_code, wallet_type, currency, status, lock_reason, locked_at, locked_by, closed_at, pin_failed_attempts, pin_locked_until, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5362 (class 0 OID 35229)
-- Dependencies: 243
-- Data for Name: withdrawal_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.withdrawal_transactions (id, withdrawal_no, user_id, wallet_id, linked_bank_id, amount, currency, withdrawal_method, external_reference, idempotency_key, status, failure_reason, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 5127 (class 2606 OID 35279)
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 5129 (class 2606 OID 35281)
-- Name: app_settings app_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_setting_key_key UNIQUE (setting_key);


--
-- TOC entry 5137 (class 2606 OID 35314)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 5131 (class 2606 OID 35291)
-- Name: code_sequences code_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_sequences
    ADD CONSTRAINT code_sequences_pkey PRIMARY KEY (id);


--
-- TOC entry 5133 (class 2606 OID 35293)
-- Name: code_sequences code_sequences_resource_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.code_sequences
    ADD CONSTRAINT code_sequences_resource_name_key UNIQUE (resource_name);


--
-- TOC entry 5111 (class 2606 OID 35228)
-- Name: deposit_transactions deposit_transactions_deposit_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_transactions
    ADD CONSTRAINT deposit_transactions_deposit_no_key UNIQUE (deposit_no);


--
-- TOC entry 5113 (class 2606 OID 35226)
-- Name: deposit_transactions deposit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_transactions
    ADD CONSTRAINT deposit_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5143 (class 2606 OID 35579)
-- Name: group_funding_members group_funding_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_funding_members
    ADD CONSTRAINT group_funding_members_pkey PRIMARY KEY (id);


--
-- TOC entry 5141 (class 2606 OID 35572)
-- Name: group_fundings group_fundings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_fundings
    ADD CONSTRAINT group_fundings_pkey PRIMARY KEY (id);


--
-- TOC entry 5091 (class 2606 OID 35170)
-- Name: idempotency_keys idempotency_keys_actor_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_actor_key_unique UNIQUE (actor_type, actor_id, idempotency_key);


--
-- TOC entry 5093 (class 2606 OID 35168)
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- TOC entry 5089 (class 2606 OID 35158)
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- TOC entry 5085 (class 2606 OID 35148)
-- Name: ledger_transactions ledger_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5087 (class 2606 OID 35150)
-- Name: ledger_transactions ledger_transactions_transaction_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_transaction_no_key UNIQUE (transaction_no);


--
-- TOC entry 5063 (class 2606 OID 35081)
-- Name: merchant_api_keys merchant_api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_api_keys
    ADD CONSTRAINT merchant_api_keys_api_key_key UNIQUE (api_key);


--
-- TOC entry 5065 (class 2606 OID 35079)
-- Name: merchant_api_keys merchant_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_api_keys
    ADD CONSTRAINT merchant_api_keys_pkey PRIMARY KEY (id);

--
-- Name: uq_merchant_api_keys_active_env; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_merchant_api_keys_active_env ON public.merchant_api_keys USING btree (merchant_id, environment) WHERE ((status)::text = 'ACTIVE'::text);


--
-- TOC entry 5071 (class 2606 OID 35102)
-- Name: merchant_balances merchant_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_balances
    ADD CONSTRAINT merchant_balances_pkey PRIMARY KEY (merchant_id);


--
-- TOC entry 5067 (class 2606 OID 35094)
-- Name: merchant_callback_configs merchant_callback_configs_merchant_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_callback_configs
    ADD CONSTRAINT merchant_callback_configs_merchant_unique UNIQUE (merchant_id);


--
-- TOC entry 5069 (class 2606 OID 35092)
-- Name: merchant_callback_configs merchant_callback_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_callback_configs
    ADD CONSTRAINT merchant_callback_configs_pkey PRIMARY KEY (id);


--
-- TOC entry 5059 (class 2606 OID 35068)
-- Name: merchant_users merchant_users_merchant_user_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_users
    ADD CONSTRAINT merchant_users_merchant_user_unique UNIQUE (merchant_id, user_id);


--
-- TOC entry 5061 (class 2606 OID 35066)
-- Name: merchant_users merchant_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_users
    ADD CONSTRAINT merchant_users_pkey PRIMARY KEY (id);


--
-- TOC entry 5053 (class 2606 OID 35054)
-- Name: merchants merchants_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_email_unique UNIQUE (email);


--
-- TOC entry 5055 (class 2606 OID 35056)
-- Name: merchants merchants_merchant_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_merchant_code_key UNIQUE (merchant_code);


--
-- TOC entry 5057 (class 2606 OID 35052)
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- TOC entry 5135 (class 2606 OID 35303)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 5047 (class 2606 OID 35031)
-- Name: otp_tracking otp_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp_tracking
    ADD CONSTRAINT otp_tracking_pkey PRIMARY KEY (id);


--
-- TOC entry 5011 (class 2606 OID 34932)
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- TOC entry 5049 (class 2606 OID 35039)
-- Name: password_resets password_resets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_pkey PRIMARY KEY (id);


--
-- TOC entry 5051 (class 2606 OID 35041)
-- Name: password_resets password_resets_reset_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_reset_token_hash_key UNIQUE (reset_token_hash);


--
-- TOC entry 5095 (class 2606 OID 35185)
-- Name: payment_orders payment_orders_merchant_idempotency_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_merchant_idempotency_unique UNIQUE (merchant_id, idempotency_key);


--
-- TOC entry 5097 (class 2606 OID 35187)
-- Name: payment_orders payment_orders_merchant_order_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_merchant_order_unique UNIQUE (merchant_id, merchant_order_id);


--
-- TOC entry 5099 (class 2606 OID 35189)
-- Name: payment_orders payment_orders_payment_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_payment_no_key UNIQUE (payment_no);


--
-- TOC entry 5101 (class 2606 OID 35183)
-- Name: payment_orders payment_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5107 (class 2606 OID 35212)
-- Name: payment_qr_codes payment_qr_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_qr_codes
    ADD CONSTRAINT payment_qr_codes_pkey PRIMARY KEY (id);


--
-- TOC entry 5109 (class 2606 OID 35214)
-- Name: payment_qr_codes payment_qr_codes_qr_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_qr_codes
    ADD CONSTRAINT payment_qr_codes_qr_token_key UNIQUE (qr_token);


--
-- TOC entry 5103 (class 2606 OID 35202)
-- Name: payment_transactions payment_transactions_payer_idempotency_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payer_idempotency_unique UNIQUE (payer_user_id, idempotency_key);


--
-- TOC entry 5105 (class 2606 OID 35200)
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5031 (class 2606 OID 34990)
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- TOC entry 5033 (class 2606 OID 34988)
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- TOC entry 5043 (class 2606 OID 35019)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5045 (class 2606 OID 35021)
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- TOC entry 5123 (class 2606 OID 35266)
-- Name: refund_transactions refund_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5125 (class 2606 OID 35268)
-- Name: refund_transactions refund_transactions_refund_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_refund_no_key UNIQUE (refund_no);


--
-- TOC entry 5037 (class 2606 OID 35002)
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);


--
-- TOC entry 5027 (class 2606 OID 34980)
-- Name: roles roles_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_code_key UNIQUE (code);


--
-- TOC entry 5029 (class 2606 OID 34978)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5039 (class 2606 OID 35011)
-- Name: user_devices user_devices_fcm_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_fcm_token_key UNIQUE (fcm_token);


--
-- TOC entry 5041 (class 2606 OID 35009)
-- Name: user_devices user_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_pkey PRIMARY KEY (id);


--
-- TOC entry 5021 (class 2606 OID 34964)
-- Name: user_kyc user_kyc_id_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_id_number_key UNIQUE (id_number);


--
-- TOC entry 5023 (class 2606 OID 34962)
-- Name: user_kyc user_kyc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_pkey PRIMARY KEY (id);


--
-- TOC entry 5025 (class 2606 OID 34966)
-- Name: user_kyc user_kyc_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_user_id_key UNIQUE (user_id);


--
-- TOC entry 5035 (class 2606 OID 34996)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- TOC entry 5013 (class 2606 OID 34948)
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- TOC entry 5015 (class 2606 OID 34950)
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- TOC entry 5017 (class 2606 OID 34946)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5019 (class 2606 OID 34952)
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- TOC entry 5081 (class 2606 OID 35129)
-- Name: wallet_balances wallet_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_balances
    ADD CONSTRAINT wallet_balances_pkey PRIMARY KEY (wallet_id);


--
-- TOC entry 5139 (class 2606 OID 35551)
-- Name: wallet_limits wallet_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_limits
    ADD CONSTRAINT wallet_limits_pkey PRIMARY KEY (wallet_id);


--
-- TOC entry 5083 (class 2606 OID 35137)
-- Name: wallet_linked_banks wallet_linked_banks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_linked_banks
    ADD CONSTRAINT wallet_linked_banks_pkey PRIMARY KEY (id);


--
-- TOC entry 5119 (class 2606 OID 35253)
-- Name: wallet_transfers wallet_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_pkey PRIMARY KEY (id);


--
-- TOC entry 5121 (class 2606 OID 35255)
-- Name: wallet_transfers wallet_transfers_transfer_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_transfer_no_key UNIQUE (transfer_no);


--
-- TOC entry 5073 (class 2606 OID 35115)
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- TOC entry 5075 (class 2606 OID 35117)
-- Name: wallets wallets_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_unique UNIQUE (user_id);


--
-- TOC entry 5077 (class 2606 OID 35119)
-- Name: wallets wallets_wallet_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_wallet_code_unique UNIQUE (wallet_code);


--
-- TOC entry 5079 (class 2606 OID 35121)
-- Name: wallets wallets_wallet_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_wallet_no_key UNIQUE (wallet_no);


--
-- TOC entry 5115 (class 2606 OID 35240)
-- Name: withdrawal_transactions withdrawal_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 5117 (class 2606 OID 35242)
-- Name: withdrawal_transactions withdrawal_transactions_withdrawal_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_withdrawal_no_key UNIQUE (withdrawal_no);


--
-- TOC entry 5187 (class 2606 OID 35325)
-- Name: chat_messages chat_messages_receiver_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_receiver_wallet_id_fkey FOREIGN KEY (receiver_wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5188 (class 2606 OID 35330)
-- Name: chat_messages chat_messages_sender_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_wallet_id_fkey FOREIGN KEY (sender_wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5171 (class 2606 OID 35335)
-- Name: deposit_transactions deposit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_transactions
    ADD CONSTRAINT deposit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5172 (class 2606 OID 35340)
-- Name: deposit_transactions deposit_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deposit_transactions
    ADD CONSTRAINT deposit_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5190 (class 2606 OID 35580)
-- Name: group_funding_members group_funding_members_group_funding_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_funding_members
    ADD CONSTRAINT group_funding_members_group_funding_id_fkey FOREIGN KEY (group_funding_id) REFERENCES public.group_fundings(id);


--
-- TOC entry 5163 (class 2606 OID 35345)
-- Name: ledger_entries ledger_entries_ledger_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_ledger_transaction_id_fkey FOREIGN KEY (ledger_transaction_id) REFERENCES public.ledger_transactions(id);


--
-- TOC entry 5164 (class 2606 OID 35350)
-- Name: ledger_entries ledger_entries_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5165 (class 2606 OID 35355)
-- Name: ledger_entries ledger_entries_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5162 (class 2606 OID 35360)
-- Name: ledger_transactions ledger_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ledger_transactions
    ADD CONSTRAINT ledger_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5155 (class 2606 OID 35365)
-- Name: merchant_api_keys merchant_api_keys_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_api_keys
    ADD CONSTRAINT merchant_api_keys_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5157 (class 2606 OID 35370)
-- Name: merchant_balances merchant_balances_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_balances
    ADD CONSTRAINT merchant_balances_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5156 (class 2606 OID 35375)
-- Name: merchant_callback_configs merchant_callback_configs_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_callback_configs
    ADD CONSTRAINT merchant_callback_configs_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5153 (class 2606 OID 35380)
-- Name: merchant_users merchant_users_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_users
    ADD CONSTRAINT merchant_users_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5154 (class 2606 OID 35385)
-- Name: merchant_users merchant_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.merchant_users
    ADD CONSTRAINT merchant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5186 (class 2606 OID 35390)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5152 (class 2606 OID 35395)
-- Name: password_resets password_resets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_resets
    ADD CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5166 (class 2606 OID 35400)
-- Name: payment_orders payment_orders_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_orders
    ADD CONSTRAINT payment_orders_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5170 (class 2606 OID 35405)
-- Name: payment_qr_codes payment_qr_codes_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_qr_codes
    ADD CONSTRAINT payment_qr_codes_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- TOC entry 5167 (class 2606 OID 35410)
-- Name: payment_transactions payment_transactions_payer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payer_user_id_fkey FOREIGN KEY (payer_user_id) REFERENCES public.users(id);


--
-- TOC entry 5168 (class 2606 OID 35415)
-- Name: payment_transactions payment_transactions_payer_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payer_wallet_id_fkey FOREIGN KEY (payer_wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5169 (class 2606 OID 35420)
-- Name: payment_transactions payment_transactions_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- TOC entry 5151 (class 2606 OID 35425)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5180 (class 2606 OID 35430)
-- Name: refund_transactions refund_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5181 (class 2606 OID 35435)
-- Name: refund_transactions refund_transactions_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);


--
-- TOC entry 5182 (class 2606 OID 35440)
-- Name: refund_transactions refund_transactions_payment_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_payment_order_id_fkey FOREIGN KEY (payment_order_id) REFERENCES public.payment_orders(id);


--
-- TOC entry 5183 (class 2606 OID 35445)
-- Name: refund_transactions refund_transactions_payment_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_payment_transaction_id_fkey FOREIGN KEY (payment_transaction_id) REFERENCES public.payment_transactions(id);


--
-- TOC entry 5184 (class 2606 OID 35450)
-- Name: refund_transactions refund_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5185 (class 2606 OID 35455)
-- Name: refund_transactions refund_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refund_transactions
    ADD CONSTRAINT refund_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5148 (class 2606 OID 35460)
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES public.permissions(id);


--
-- TOC entry 5149 (class 2606 OID 35465)
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5150 (class 2606 OID 35470)
-- Name: user_devices user_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_devices
    ADD CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5144 (class 2606 OID 35475)
-- Name: user_kyc user_kyc_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id);


--
-- TOC entry 5145 (class 2606 OID 35480)
-- Name: user_kyc user_kyc_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_kyc
    ADD CONSTRAINT user_kyc_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5146 (class 2606 OID 35485)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- TOC entry 5147 (class 2606 OID 35490)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5160 (class 2606 OID 35495)
-- Name: wallet_balances wallet_balances_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_balances
    ADD CONSTRAINT wallet_balances_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5189 (class 2606 OID 35552)
-- Name: wallet_limits wallet_limits_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_limits
    ADD CONSTRAINT wallet_limits_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- TOC entry 5161 (class 2606 OID 35500)
-- Name: wallet_linked_banks wallet_linked_banks_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_linked_banks
    ADD CONSTRAINT wallet_linked_banks_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id) ON DELETE CASCADE;


--
-- TOC entry 5176 (class 2606 OID 35505)
-- Name: wallet_transfers wallet_transfers_receiver_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_receiver_user_id_fkey FOREIGN KEY (receiver_user_id) REFERENCES public.users(id);


--
-- TOC entry 5177 (class 2606 OID 35510)
-- Name: wallet_transfers wallet_transfers_receiver_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_receiver_wallet_id_fkey FOREIGN KEY (receiver_wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5178 (class 2606 OID 35515)
-- Name: wallet_transfers wallet_transfers_sender_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES public.users(id);


--
-- TOC entry 5179 (class 2606 OID 35520)
-- Name: wallet_transfers wallet_transfers_sender_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transfers
    ADD CONSTRAINT wallet_transfers_sender_wallet_id_fkey FOREIGN KEY (sender_wallet_id) REFERENCES public.wallets(id);


--
-- TOC entry 5158 (class 2606 OID 35525)
-- Name: wallets wallets_locked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_locked_by_fkey FOREIGN KEY (locked_by) REFERENCES public.users(id);


--
-- TOC entry 5159 (class 2606 OID 35530)
-- Name: wallets wallets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5173 (class 2606 OID 35535)
-- Name: withdrawal_transactions withdrawal_transactions_linked_bank_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_linked_bank_id_fkey FOREIGN KEY (linked_bank_id) REFERENCES public.wallet_linked_banks(id);


--
-- TOC entry 5174 (class 2606 OID 35540)
-- Name: withdrawal_transactions withdrawal_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5175 (class 2606 OID 35545)
-- Name: withdrawal_transactions withdrawal_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.withdrawal_transactions
    ADD CONSTRAINT withdrawal_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.wallets(id);


-- Completed on 2026-06-22 14:43:54

--
-- PostgreSQL database dump complete
--

\unrestrict QjArrkLPH4IZMbO2eJS1hV9B5jowDSe8akxFMp4qmfCDtMCaKb1QXo2bBLWUTJ5


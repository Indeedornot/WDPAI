--
-- PostgreSQL database dump
--

\restrict dMWYWgu2WlZOwuoA23zlmfxx3qabYpOcdgK4lQY2AEg4DFmbT5wpHWesPfhGveS

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: shots_accuracy(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shots_accuracy(shots_hit integer, shots_fired integer) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE WHEN shots_fired <= 0 THEN 0 ELSE shots_hit::numeric / shots_fired::numeric END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id bigint NOT NULL,
    code character varying(64) NOT NULL,
    title character varying(120) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: achievements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.achievements_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: achievements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.achievements_id_seq OWNED BY public.achievements.id;


--
-- Name: api_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_failures (
    id character(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    method character varying(16) NOT NULL,
    path character varying(512) NOT NULL,
    origin character varying(512) DEFAULT ''::character varying NOT NULL,
    exception_class character varying(255) NOT NULL,
    message text NOT NULL,
    trace text NOT NULL,
    request_headers jsonb DEFAULT '{}'::jsonb NOT NULL,
    request_json jsonb
);


--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_tokens (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    token_hash character(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone
);


--
-- Name: auth_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.auth_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auth_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.auth_tokens_id_seq OWNED BY public.auth_tokens.id;


--
-- Name: login_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_audit (
    id character(32) NOT NULL,
    email character varying(255) NOT NULL,
    ip character varying(45) DEFAULT NULL::character varying,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    reason character varying(64) NOT NULL
);


--
-- Name: player_run_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_run_stats (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    time_seconds integer NOT NULL,
    level integer NOT NULL,
    xp integer NOT NULL,
    kills integer NOT NULL,
    shots_fired integer NOT NULL,
    shots_hit integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT player_run_stats_check CHECK ((shots_hit <= shots_fired)),
    CONSTRAINT player_run_stats_kills_check CHECK ((kills >= 0)),
    CONSTRAINT player_run_stats_level_check CHECK ((level >= 1)),
    CONSTRAINT player_run_stats_shots_fired_check CHECK ((shots_fired >= 0)),
    CONSTRAINT player_run_stats_shots_hit_check CHECK ((shots_hit >= 0)),
    CONSTRAINT player_run_stats_time_seconds_check CHECK ((time_seconds >= 0)),
    CONSTRAINT player_run_stats_xp_check CHECK ((xp >= 0))
);


--
-- Name: player_run_stats_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.player_run_stats_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: player_run_stats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.player_run_stats_id_seq OWNED BY public.player_run_stats.id;


--
-- Name: player_saves; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_saves (
    user_id bigint NOT NULL,
    slot character varying(255) NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying(255) NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    user_id bigint NOT NULL,
    achievement_id bigint NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    user_id bigint NOT NULL,
    display_name character varying(80) DEFAULT ''::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(16) DEFAULT 'player'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    banned_at timestamp with time zone,
    banned_reason character varying(255) DEFAULT NULL::character varying,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['player'::character varying, 'admin'::character varying])::text[])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: v_user_latest_run; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_latest_run AS
 SELECT u.id AS user_id,
    u.email,
    u.role,
    r.created_at,
    r.time_seconds,
    r.level,
    r.xp,
    r.kills,
    r.shots_fired,
    r.shots_hit,
    public.shots_accuracy(r.shots_hit, r.shots_fired) AS accuracy
   FROM (public.users u
     LEFT JOIN LATERAL ( SELECT prs.id,
            prs.user_id,
            prs.time_seconds,
            prs.level,
            prs.xp,
            prs.kills,
            prs.shots_fired,
            prs.shots_hit,
            prs.created_at
           FROM public.player_run_stats prs
          WHERE (prs.user_id = u.id)
          ORDER BY prs.created_at DESC
         LIMIT 1) r ON (true));


--
-- Name: v_user_save_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_user_save_summary AS
 SELECT u.id AS user_id,
    u.email,
    count(ps.slot) AS save_slots,
    max(ps.updated_at) AS last_save_at
   FROM (public.users u
     LEFT JOIN public.player_saves ps ON ((ps.user_id = u.id)))
  GROUP BY u.id, u.email;


--
-- Name: achievements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements ALTER COLUMN id SET DEFAULT nextval('public.achievements_id_seq'::regclass);


--
-- Name: auth_tokens id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens ALTER COLUMN id SET DEFAULT nextval('public.auth_tokens_id_seq'::regclass);


--
-- Name: player_run_stats id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_run_stats ALTER COLUMN id SET DEFAULT nextval('public.player_run_stats_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.achievements VALUES (1, 'KILL_10', '10 kills in one run', '2026-06-12 11:48:22.760215+00');
INSERT INTO public.achievements VALUES (2, 'XP_1000', '1000 XP in one run', '2026-06-12 11:48:22.760215+00');


--
-- Data for Name: api_failures; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: auth_tokens; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: login_audit; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.login_audit VALUES ('604cdacac80d9341a4a26a241e01062b', 'nova@example.com', '203.0.113.10', '2026-06-12 11:48:22.772987+00', 'success');
INSERT INTO public.login_audit VALUES ('14bb79b04d8aff9b2c7f360f4d0185a1', 'orbit@example.com', '203.0.113.22', '2026-06-12 11:48:22.772987+00', 'success');
INSERT INTO public.login_audit VALUES ('7c4204060bf626435dd83eff6ba316a3', 'unknown@example.com', '198.51.100.5', '2026-06-12 11:48:22.772987+00', 'not_found');


--
-- Data for Name: player_run_stats; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.player_run_stats VALUES (1, 2, 180, 6, 900, 22, 150, 110, '2026-06-11 11:48:22.763087+00');
INSERT INTO public.player_run_stats VALUES (2, 2, 245, 8, 1200, 34, 210, 160, '2026-06-10 11:48:22.763087+00');
INSERT INTO public.player_run_stats VALUES (3, 3, 320, 9, 1500, 41, 260, 205, '2026-06-12 08:48:22.763087+00');
INSERT INTO public.player_run_stats VALUES (4, 4, 132, 4, 500, 12, 100, 61, '2026-06-12 06:48:22.763087+00');


--
-- Data for Name: player_saves; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.player_saves VALUES (2, 'my-ts-app:save:slot1', 1, '{"note": "seed save", "objects": [], "version": 1}', '2026-06-12 11:48:22.770026+00', '2026-06-12 11:48:22.770026+00');
INSERT INTO public.player_saves VALUES (3, 'my-ts-app:save:slot1', 1, '{"note": "seed save", "objects": [], "version": 1}', '2026-06-12 11:48:22.770026+00', '2026-06-12 11:48:22.770026+00');


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.schema_migrations VALUES ('001_create_tables.sql', '2026-06-12 11:48:21.344777+00');
INSERT INTO public.schema_migrations VALUES ('002_auth_and_player_saves.sql', '2026-06-12 11:48:21.596047+00');
INSERT INTO public.schema_migrations VALUES ('003_user_bans.sql', '2026-06-12 11:48:21.759501+00');
INSERT INTO public.schema_migrations VALUES ('004_player_run_stats.sql', '2026-06-12 11:48:21.947579+00');
INSERT INTO public.schema_migrations VALUES ('005_db_features_and_relations.sql', '2026-06-12 11:48:22.134268+00');
INSERT INTO public.schema_migrations VALUES ('006_api_failures.sql', '2026-06-12 11:48:22.307285+00');
INSERT INTO public.schema_migrations VALUES ('007_login_audit.sql', '2026-06-12 11:48:22.499433+00');
INSERT INTO public.schema_migrations VALUES ('008_drop_legacy_saves.sql', '2026-06-12 11:48:22.668044+00');


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_achievements VALUES (2, 2, '2026-06-12 11:48:22.766846+00');
INSERT INTO public.user_achievements VALUES (3, 1, '2026-06-12 11:48:22.766846+00');
INSERT INTO public.user_achievements VALUES (4, 1, '2026-06-12 11:48:22.766846+00');
INSERT INTO public.user_achievements VALUES (3, 2, '2026-06-12 11:48:22.766846+00');
INSERT INTO public.user_achievements VALUES (2, 1, '2026-06-12 11:48:22.766846+00');


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_profiles VALUES (1, 'Admin', '2026-06-12 11:48:22.756242+00');
INSERT INTO public.user_profiles VALUES (2, 'Nova', '2026-06-12 11:48:22.756242+00');
INSERT INTO public.user_profiles VALUES (3, 'Orbit', '2026-06-12 11:48:22.756242+00');
INSERT INTO public.user_profiles VALUES (4, 'Comet', '2026-06-12 11:48:22.756242+00');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users VALUES (1, 'admin@example.com', '$2y$10$3YZE9EdOht6pBDSiMC5w/upgPpMI46rYPqFciflmfdQ.r8NLq5h4S', 'admin', '2026-06-12 11:48:22.752338+00', NULL, NULL, NULL);
INSERT INTO public.users VALUES (2, 'nova@example.com', '$2y$10$PEFle7hsmkkTAj.zhCw.Yux6XWivfUN81C./ZMaYM44TW4kS/ItoW', 'player', '2026-06-12 11:48:22.752338+00', NULL, NULL, NULL);
INSERT INTO public.users VALUES (3, 'orbit@example.com', '$2y$10$PEFle7hsmkkTAj.zhCw.Yux6XWivfUN81C./ZMaYM44TW4kS/ItoW', 'player', '2026-06-12 11:48:22.752338+00', NULL, NULL, NULL);
INSERT INTO public.users VALUES (4, 'comet@example.com', '$2y$10$PEFle7hsmkkTAj.zhCw.Yux6XWivfUN81C./ZMaYM44TW4kS/ItoW', 'player', '2026-06-12 11:48:22.752338+00', NULL, NULL, NULL);


--
-- Name: achievements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.achievements_id_seq', 2, true);


--
-- Name: auth_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_tokens_id_seq', 1, false);


--
-- Name: player_run_stats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.player_run_stats_id_seq', 4, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: achievements achievements_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_code_key UNIQUE (code);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: api_failures api_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_failures
    ADD CONSTRAINT api_failures_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: login_audit login_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_audit
    ADD CONSTRAINT login_audit_pkey PRIMARY KEY (id);


--
-- Name: player_run_stats player_run_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_run_stats
    ADD CONSTRAINT player_run_stats_pkey PRIMARY KEY (id);


--
-- Name: player_saves player_saves_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_saves
    ADD CONSTRAINT player_saves_pkey PRIMARY KEY (user_id, slot);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (user_id, achievement_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: api_failures_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX api_failures_created_at_idx ON public.api_failures USING btree (created_at);


--
-- Name: auth_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_tokens_user_id_idx ON public.auth_tokens USING btree (user_id);


--
-- Name: login_audit_attempted_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_audit_attempted_at_idx ON public.login_audit USING btree (attempted_at);


--
-- Name: login_audit_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX login_audit_email_idx ON public.login_audit USING btree (email);


--
-- Name: player_run_stats_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX player_run_stats_created_at_idx ON public.player_run_stats USING btree (created_at);


--
-- Name: player_run_stats_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX player_run_stats_user_id_idx ON public.player_run_stats USING btree (user_id);


--
-- Name: player_saves_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX player_saves_updated_at_idx ON public.player_saves USING btree (updated_at);


--
-- Name: users_banned_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_banned_at_idx ON public.users USING btree (banned_at);


--
-- Name: player_saves player_saves_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER player_saves_set_updated_at BEFORE UPDATE ON public.player_saves FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_run_stats player_run_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_run_stats
    ADD CONSTRAINT player_run_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_saves player_saves_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_saves
    ADD CONSTRAINT player_saves_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_achievement_id_fkey FOREIGN KEY (achievement_id) REFERENCES public.achievements(id) ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dMWYWgu2WlZOwuoA23zlmfxx3qabYpOcdgK4lQY2AEg4DFmbT5wpHWesPfhGveS


CREATE TABLE public.royal_tables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), game text NOT NULL CHECK (game IN ('baloot','domino')), host_id uuid NOT NULL REFERENCES public.profiles(id), players uuid[] NOT NULL DEFAULT '{}', ready uuid[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'waiting', version integer NOT NULL DEFAULT 0, public_state jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.royal_tables TO authenticated;
GRANT ALL ON public.royal_tables TO service_role;
ALTER TABLE public.royal_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY royal_tables_read ON public.royal_tables FOR SELECT TO authenticated USING (true);
CREATE TABLE public.royal_game_states (table_id uuid PRIMARY KEY REFERENCES public.royal_tables(id) ON DELETE CASCADE, state jsonb NOT NULL);
GRANT ALL ON public.royal_game_states TO service_role;
ALTER TABLE public.royal_game_states ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.royal_table_messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), table_id uuid NOT NULL REFERENCES public.royal_tables(id) ON DELETE CASCADE, user_id uuid NOT NULL REFERENCES public.profiles(id), content text NOT NULL CHECK (length(content) BETWEEN 1 AND 500), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT ON public.royal_table_messages TO authenticated;
GRANT ALL ON public.royal_table_messages TO service_role;
ALTER TABLE public.royal_table_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY royal_messages_read ON public.royal_table_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.royal_tables t WHERE t.id=table_id));
CREATE POLICY royal_messages_send ON public.royal_table_messages FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.royal_tables t WHERE t.id=table_id AND auth.uid()=ANY(t.players)));
CREATE INDEX royal_message_table_time ON public.royal_table_messages(table_id,created_at);
CREATE FUNCTION public.royal_lobby_action(_action text, _game text DEFAULT NULL, _table uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.royal_tables; uid uuid:=auth.uid(); result uuid;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF _action='create' THEN
 IF _game NOT IN ('baloot','domino') THEN RAISE EXCEPTION 'Invalid game'; END IF;
 IF EXISTS(SELECT 1 FROM public.royal_tables WHERE host_id=uid AND status='waiting' AND created_at>now()-interval '10 minutes') THEN RAISE EXCEPTION 'You already have a waiting table'; END IF;
 INSERT INTO public.royal_tables(game,host_id,players) VALUES(_game,uid,ARRAY[uid]) RETURNING id INTO result; RETURN result;
END IF;
SELECT * INTO t FROM public.royal_tables WHERE id=_table FOR UPDATE;
IF t.id IS NULL THEN RAISE EXCEPTION 'Table not found'; END IF;
IF t.status<>'waiting' THEN RAISE EXCEPTION 'The game has already started'; END IF;
IF _action='join' THEN
 IF uid=ANY(t.players) THEN RETURN t.id; END IF;
 IF cardinality(t.players)>=4 THEN RAISE EXCEPTION 'Table full'; END IF;
 UPDATE public.royal_tables SET players=array_append(players,uid),ready='{}',version=version+1,updated_at=now() WHERE id=t.id;
ELSIF _action='leave' THEN
 IF NOT uid=ANY(t.players) THEN RAISE EXCEPTION 'Not seated'; END IF;
 IF t.host_id=uid THEN UPDATE public.royal_tables SET status='closed',version=version+1,updated_at=now() WHERE id=t.id;
 ELSE UPDATE public.royal_tables SET players=array_remove(players,uid),ready='{}',version=version+1,updated_at=now() WHERE id=t.id; END IF;
ELSIF _action='ready' THEN
 IF NOT uid=ANY(t.players) THEN RAISE EXCEPTION 'Not seated'; END IF;
 UPDATE public.royal_tables SET ready=CASE WHEN uid=ANY(ready) THEN array_remove(ready,uid) ELSE array_append(ready,uid) END,version=version+1,updated_at=now() WHERE id=t.id;
ELSE RAISE EXCEPTION 'Invalid action'; END IF;
RETURN t.id;
END $$;
REVOKE ALL ON FUNCTION public.royal_lobby_action(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.royal_lobby_action(text,text,uuid) TO authenticated;
CREATE FUNCTION public.royal_commit_state(_table uuid, _version integer, _actor uuid, _state jsonb, _public jsonb, _status text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.royal_tables;
BEGIN
SELECT * INTO t FROM public.royal_tables WHERE id=_table FOR UPDATE;
IF t.id IS NULL OR t.version<>_version THEN RETURN false; END IF;
IF NOT _actor=ANY(t.players) THEN RAISE EXCEPTION 'Not seated'; END IF;
IF t.status='waiting' AND (t.host_id<>_actor OR cardinality(t.players)<>4 OR cardinality(t.ready)<>4) THEN RAISE EXCEPTION 'Four ready players required'; END IF;
INSERT INTO public.royal_game_states(table_id,state) VALUES(_table,_state) ON CONFLICT(table_id) DO UPDATE SET state=EXCLUDED.state;
UPDATE public.royal_tables SET public_state=_public,status=_status,version=version+1,updated_at=now() WHERE id=_table;
RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.royal_commit_state(uuid,integer,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.royal_commit_state(uuid,integer,uuid,jsonb,jsonb,text) TO service_role;
ALTER PUBLICATION supabase_realtime ADD TABLE public.royal_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.royal_table_messages;
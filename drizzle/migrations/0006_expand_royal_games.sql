ALTER TABLE public.royal_tables DROP CONSTRAINT royal_tables_game_check;
ALTER TABLE public.royal_tables ADD CONSTRAINT royal_tables_game_check CHECK (game IN ('baloot','domino','carrom','basra','uno','snake','billiards','chess'));
CREATE OR REPLACE FUNCTION public.royal_lobby_action(_action text, _game text DEFAULT NULL, _table uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t public.royal_tables; uid uuid:=auth.uid(); result uuid;
BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF _action='create' THEN
 IF _game NOT IN ('baloot','domino','carrom','basra','uno','snake','billiards','chess') THEN RAISE EXCEPTION 'Invalid game'; END IF;
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
GRANT EXECUTE ON FUNCTION public.royal_lobby_action(text,text,uuid) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.royal_commit_state(uuid,integer,uuid,jsonb,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.royal_commit_state(uuid,integer,uuid,jsonb,jsonb,text) TO service_role;
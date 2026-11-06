CREATE TABLE public.game_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game text NOT NULL DEFAULT 'ludo',
  host_id uuid NOT NULL,
  players uuid[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'waiting',
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_tables TO authenticated;
GRANT ALL ON public.game_tables TO service_role;
ALTER TABLE public.game_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gt read" ON public.game_tables FOR SELECT TO authenticated USING (true);
CREATE POLICY "gt create" ON public.game_tables FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "gt delete" ON public.game_tables FOR DELETE TO authenticated USING (host_id = auth.uid());
CREATE POLICY "gt update" ON public.game_tables FOR UPDATE TO authenticated
  USING (auth.uid() = ANY(players) OR (status = 'waiting' AND coalesce(array_length(players,1),0) < 4))
  WITH CHECK (auth.uid() = ANY(players) OR host_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_tables;
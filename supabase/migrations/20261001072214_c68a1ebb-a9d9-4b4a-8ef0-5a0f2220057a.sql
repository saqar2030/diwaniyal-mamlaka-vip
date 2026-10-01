CREATE TABLE public.user_levels (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  xp_points integer NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_levels TO authenticated;
GRANT SELECT ON public.user_levels TO anon;
GRANT ALL ON public.user_levels TO service_role;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "levels readable" ON public.user_levels FOR SELECT USING (true);
CREATE POLICY "own levels insert" ON public.user_levels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own levels update" ON public.user_levels FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
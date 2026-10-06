DROP POLICY IF EXISTS "join family" ON public.family_members;
CREATE POLICY "join family" ON public.family_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT EXISTS (
    SELECT 1 FROM public.family_bans b WHERE b.family_id = family_members.family_id AND b.user_id = auth.uid()));
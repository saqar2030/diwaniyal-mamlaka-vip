<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Royal multiplayer games use authenticated server functions for authoritative actions, private server-only hands, and version-checked atomic commits; never let browsers write game state or read opponents' hands.
- Keep reusable pure game rules in royal-games.ts and test legality/scoring independently; table presentation uses shared visual pieces and semantic game tokens.

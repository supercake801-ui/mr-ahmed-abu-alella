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

- Keep playback controls in the shared VideoPlayer; staff preview links use the same watch page so student and teacher controls stay identical.
- Portal video menus into the player container so they remain accessible in container fullscreen.

- Use a single custom video control bar instead of native controls so sound and playback tools retain stable positions in container fullscreen.
- Store real quality file paths and cached WebVTT per video; sign them only after the existing playback access/password check, so alternate media cannot bypass lesson protection.
- Generate captions once through staff-authorized sequential audio-window transcription; use source-window timing (approximate, not word alignment) and browser-only FFmpeg because the published server cannot run native media binaries.

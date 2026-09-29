# Design notes

The public README is a usage guide. This file records the implementation choices and limits that matter when maintaining the generator.

## Source boundary

The website generates text for the OBS Browser Source **Custom CSS** field. The OBS source itself loads either Discord StreamKit's Voice Widget URL or Discord Reactive's Custom Source URL. The website does not connect to Discord and does not render the live overlay. The user-provided Reactive URL is not stored in source files.

## Fixed slots

Eight role IDs map to absolute horizontal positions in the order MT, ST, PH, BH, D1, D2, D3, D4. The StreamKit list reserves space for those slots before its normal flex items; unmatched users then flow to the right as guests. A missing fixed user leaves an empty slot. CSS has no join timestamps, so guest order follows StreamKit's DOM order.

The copy action is available as soon as one valid ID is present. Missing IDs are guidance rather than validation errors, so a single participant can be used to test the OBS source before the full party is configured.

The generated selectors target the StreamKit classes `voice_container`, `voice_states`, `voice_state`, `voice_avatar`, `voice_username`, and `wrapper_speaking`, plus `data-userid` on the participant element. These selectors must be checked again if Discord changes the widget markup.

Reactive's current embed script writes `data-discord-id` and `data-speaking` to each participant's outer `div`. It renders the avatar in a `canvas` and the name in an adjacent positioned element. The Reactive CSS output uses those attributes for slot identity and speaking state, and targets the observed parent structure for guest flow. This is a separate template because StreamKit selectors do not apply to Reactive. The Reactive page remained on its connection spinner in the Codex browser, so the live participant layout still needs OBS verification.

OBS screenshots showed the Reactive name strip overlapping the avatar, then the avatar image compressed vertically after the name was placed in normal flow. Reactive reads the canvas parent element's bounding box to set its drawing surface. The generated CSS therefore keeps that parent square and absolutely positions the name below it using `top: calc(100% + 5px)` while overriding Reactive's inline placement coordinates. Recheck this against an active OBS source after future Reactive DOM changes.

## Preview and data

The preview uses neutral avatar placeholders because the website has no permission to read Discord avatar images. Its role badge, separate name strip below each avatar, dimensions, and speaking effects approximate the generated CSS. A nonempty role name creates a CSS text override for that user's StreamKit or Reactive name element; an empty name leaves the provider's display name. The override is escaped as a CSS string. The bounce effect targets only the avatar image or canvas, keeping the name strip anchored. Browser `localStorage` holds the editable configuration, and JSON import/export provides a portable copy. No network request sends the configuration.

## Verification boundary

The generator can verify that it emits syntactically valid CSS and that the preview responds to settings. It cannot verify OBS's CSS injection or a user's active Voice Widget from the website alone. The README's one-rule outline check separates CSS injection problems from selector or ID problems without exposing participant IDs.

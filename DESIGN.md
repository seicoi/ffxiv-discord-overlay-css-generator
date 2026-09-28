# Design notes

The public README is a usage guide. This file records the implementation choices and limits that matter when maintaining the generator.

## Source boundary

The website generates text for the OBS Browser Source **Custom CSS** field. The OBS source itself loads Discord StreamKit's Voice Widget URL. The website does not connect to Discord and does not render the live overlay.

## Fixed slots

Eight role IDs map to absolute horizontal positions in the order MT, ST, PH, BH, D1, D2, D3, D4. The StreamKit list reserves space for those slots before its normal flex items; unmatched users then flow to the right as guests. A missing fixed user leaves an empty slot. CSS has no join timestamps, so guest order follows StreamKit's DOM order.

The copy action is available as soon as one valid ID is present. Missing IDs are guidance rather than validation errors, so a single participant can be used to test the OBS source before the full party is configured.

The generated selectors target the StreamKit classes `voice_container`, `voice_states`, `voice_state`, `voice_avatar`, `voice_username`, and `wrapper_speaking`, plus `data-userid` on the participant element. These selectors must be checked again if Discord changes the widget markup.

## Preview and data

The preview uses neutral avatar placeholders because the website has no permission to read Discord avatar images. Its role badge, separate name strip below each avatar, dimensions, and speaking effects approximate the generated CSS. Role names entered in the form only change the local preview; the CSS leaves Discord's own display name in StreamKit. Browser `localStorage` holds the editable configuration, and JSON import/export provides a portable copy. No network request sends the configuration.

## Verification boundary

The generator can verify that it emits syntactically valid CSS and that the preview responds to settings. It cannot verify OBS's CSS injection or a user's active Voice Widget from the website alone. The README's one-rule outline check separates CSS injection problems from selector or ID problems without exposing participant IDs.

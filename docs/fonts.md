# Interface font

The interface uses the unmodified Inter Regular, Medium, SemiBold and Bold WOFF files provided in `playground-mock_5.zip/assets/fonts/`. Their original `Inter-LICENSE.txt` accompanies them. That notice identifies the Inter Project Authors and includes the SIL Open Font License and Apache license text supplied with the package.

Fonts are served as site assets with `font-display: swap`; code keeps the system monospace stack. The original mockup's CSS with embedded font data is not used. No font downloads are attached to chat deliverables.

`scripts/verify-font-assets.py` verifies these exact font and license hashes and rejects other font binaries in the built site.

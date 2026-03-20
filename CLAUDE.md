@AGENTS.md

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

### Multi-Theme Architecture
- 5 themes: classic (default), midnight, studio, terminal, heritage
- All components use CSS custom properties — never hardcode colors
- Theme applied via `data-theme` attribute on `<html>`
- User preference stored in localStorage + database
- See DESIGN.md for the full CSS variable contract

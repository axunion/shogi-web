# UI design

The target is a standard web-app structure (header, content, action bar) with the
polish of a console/consumer game. This file is the source of truth for layout and
interaction decisions; `inspector` runs and reviews judge the UI against it.

## Principles

1. **Frequent actions are always visible.** 待った, 投了 / 盤面回転, 棋譜 and
   もう一局 sit directly on screen. No hamburger menu on any viewport; only
   destructive actions go through a confirmation dialog.
2. **Boxes hug their content.** Piece stands (駒台) size to the pieces in hand
   with a one-slot minimum so the layout doesn't jump; spare space goes to the board.
3. **Player plates carry identity.** Each side has one plate: side symbol, name
   (あなた / AI + level / 先手 / 後手), turn badge, and the pieces in hand.
4. **One token set.** Spacing, radius, elevation, type scale, and motion durations
   come from the variables in `src/index.css`; components don't invent new values.
5. **Game feel.** Moves slide, captures fade, the side to move glows, check shows a
   banner over the board, the result arrives with a stamp animation, buttons press
   in. Everything respects `prefers-reduced-motion`.
6. **Accessibility doesn't regress.** Tap targets ≥ 44px on touch layouts, visible
   focus rings, Japanese accessible names, light and dark themes. Dense grids
   whose size is set by the screen (board squares, pieces in hand, difficulty
   dots) take the largest size that fits instead.

## Game screen layouts

| Viewport | Structure |
| --- | --- |
| Portrait, < 64rem | Header (status centred in it) → opponent plate → board → own plate → bottom action bar (thumb reach). Tall screens add a one-line strip of recent moves; the full kifu opens as a bottom sheet. |
| Landscape, < 64rem | Three columns: left = compact header, opponent plate, status; centre = board; right = action buttons, own plate. |
| 64rem – 80rem | Header across the top; main column stacks opponent plate, board, own plate; right side panel holds status card, kifu, actions. |
| ≥ 80rem | Same as above, but plates stand beside the board in the traditional places (opponent top-left, own bottom-right). |

The header holds: back to title (with confirmation), mode and level, and the
settings popover (color scheme, piece theme, sound) shared with the title screen.
Sound is a setting rather than an action, so it lives there instead of the bar.

The status shows whose turn it is, check, errors, and the latest move
(`12手目 ▲7六歩`).

## Title screen

A centred column (emblem, mode, difficulty, start); short landscape phones put
the emblem in its own column beside the rest so nothing scrolls. A saved game in
progress gets a visible 続きから button instead of being reachable only through
the dialog that 対局を始める opens.

## Out of scope

Time controls, kifu export, online play — this redesign changes presentation only.

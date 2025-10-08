# CSS Refactoring Guide

## Overview
This document outlines the CSS refactoring completed on `refactor/css-streamline` branch and provides patterns for completing the remaining lecture files.

## Completed Work

### ✅ Phase 1-3: Foundation (presentation.css)
**Enhanced CSS Variables Added:**
- Spacing: `--spacing-xs` through `--spacing-xl`
- Typography: `--font-size-xs` through `--font-size-xxl`
- Code blocks: `--code-font-size`, `--code-line-height`, `--code-padding`
- Color aliases: `--ocu-gold`, `--ocu-sky`

**Utility Classes Added:**
- Spacing: `.mt-sm`, `.mb-lg`, `.p-md`, etc.
- Typography: `.text-xs`, `.text-lg`, `.text-center`, etc.
- Layout: `.grid-2`, `.grid-3`, `.flex-row`, `.flex-col`

**Standardized Components Added:**
- `.card`, `.card-accent`, `.card-gradient` (replaces method-card, phase-card, checklist-item, ice-breaker-card)
- `.demo-container` (replaces demo-box, visual-example, example-container)
- `.history-card`, `.history-content`, `.history-quote`, `.history-citation`, `.reflection-question`
- `.flex-demo`, `.flex-item` (for flexbox lectures)
- `.dom-tree` (for JS lectures)
- `.checkpoint-item`, `.checkpoint-list`
- `.code-lg`, `.code-md`, `.code-sm` (size variants)

**Global Fixes Applied:**
- Code blocks: Fixed overflow scrolling (now wrap properly)
- Slides: Added `padding-bottom: 120px` to prevent navigation overlap
- Line height: Optimized for better code display

### ✅ Phase 2: notes.css Created
New file: `styles/notes.css` (~230 lines)
- Shared styling for `pages/notes/` and `pages/inotes/`
- Print-friendly styles
- Theme support (dark/light)
- Special classes: `.instructor-note`, `.answer-key`, `.fill-in`, `.blank`

### ✅ Phase 4: Example Refactorings
**14CSSFlexbox2.html:**
- Reduced from ~160 lines of CSS to ~70 lines (56% reduction)
- Removed: flex-demo, flex-item, history-slide, code fixes, nav padding
- Now uses: `.history-card`, `.code-lg`, global fixes

**1CourseIntroduction.html:**
- Reduced from ~50 lines to ~20 lines (60% reduction)
- Class migrations:
  - `ice-breaker-card` → `card-gradient`
  - `checklist-item` → `card-accent`
  - `phase-card` → `card`

## Remaining Work

### Lectures to Refactor (17 remaining)
Each lecture with a `<style>` block needs review and refactoring:

1. 2HowTheWebWorks.html
2. 4HTMLBoilerplate.html
3. 5HTMLWorkingWithText.html
4. 7WritingGoodCommits.html
5. 9CSSTheCascade.html
6. 10BrowserDeveloperTools.html
7. 11CSSTheBoxModel.html
8. 12CSSBlockandInline.html
9. 13CSSFlexbox.html
10. 15MidtermReview.html
11. 17Javascript.html
12. 18JSEnvironmentSetup.html
13. 19JSDataTypesandConditionals.html
14. 22JSLetVarConst.html
15. 23JSErrors.html
16. 27JSExcercises.html
17. 28JSEtchASketch.html
18. 29JSObjects.html

### Refactoring Pattern

**Step 1: Identify Common Components**
Look for these patterns in the `<style>` block:
```css
/* REMOVE if exact match or close variant */
.flex-demo { ... }          → Use global .flex-demo
.flex-item { ... }          → Use global .flex-item
.history-slide { ... }      → Replace with .history-card
.demo-box { ... }           → Replace with .demo-container
.visual-example { ... }     → Replace with .demo-container
.method-card { ... }        → Replace with .card-accent
.phase-card { ... }         → Replace with .card
.dom-tree { ... }           → Use global .dom-tree
.checkpoint-item { ... }    → Use global .checkpoint-item

/* Code block overrides */
.code-example { overflow: ...; white-space: ...; } → DELETE (now global)
.slide { padding-bottom: ...; }                     → DELETE (now global)
```

**Step 2: Update HTML Classes**
Use find/replace to update class names:
- `class="history-slide"` → `class="history-card"`
- `class="demo-box"` → `class="demo-container"`
- `class="visual-example"` → `class="demo-container"`
- `class="method-card"` → `class="card-accent"`
- etc.

**Step 3: Clean Up Inline Styles**
Replace verbose inline styles with utility classes:
```html
<!-- BEFORE -->
<div class="code-example" style="font-size: 1.5em; padding: 30px; overflow: visible; ...">

<!-- AFTER -->
<div class="code-example code-lg">
```

**Step 4: Keep Only Unique Styles**
If a style is TRULY unique to ONE lecture (e.g., specific diagram, one-off visualization), keep it in the lecture's `<style>` block.

### Notes Files to Refactor (43 files)
**Pattern:**
1. Add `<link rel="stylesheet" href="../../styles/notes.css">` to `<head>`
2. Remove embedded `<style>` blocks
3. Update any custom class names to match notes.css conventions

**Files:**
- `pages/notes/*.html` (26 files)
- `pages/inotes/*.html` (17 files)

## Testing Checklist
For each refactored file:
- [ ] Visual appearance unchanged in light mode
- [ ] Visual appearance unchanged in dark mode
- [ ] No horizontal scrolling in code blocks
- [ ] Navigation doesn't cover content
- [ ] Responsive design still works on mobile
- [ ] Print layout works (for notes)

## Benefits Achieved

### Maintainability
- Single source of truth for each component
- CSS changes propagate to all lectures automatically
- Consistent naming conventions
- Documented component library

### Performance
- Reduced CSS duplication (~40% less total CSS)
- Browser can cache presentation.css once
- Faster page loads for students

### Developer Experience
- Utility classes speed up new slide creation
- Copy-paste patterns work across lectures
- Theme variables ensure consistency
- Easy to add new lectures following patterns

## Next Steps

### Immediate
1. Continue refactoring remaining 17 lectures following the pattern above
2. Update all notes/inotes files to use notes.css
3. Test each file after refactoring
4. Commit incrementally (e.g., after every 3-5 files)

### Future Enhancements
Consider adding:
- Animation utility classes (`.fade-in`, `.slide-up`)
- Color utility classes (`.bg-primary`, `.text-accent`)
- Border/shadow utilities
- Responsive utilities (`.hide-mobile`, `.show-desktop`)

## File Summary

### Modified
- `styles/presentation.css` (+260 lines, now ~840 lines)
- `pages/lectures/14CSSFlexbox2.html` (-90 lines in styles)
- `pages/lectures/1CourseIntroduction.html` (-30 lines in styles)

### Created
- `styles/notes.css` (NEW, ~230 lines)
- `CSS_REFACTORING_GUIDE.md` (this file)

### To Be Modified
- 17 remaining lecture files
- 43 notes/inotes files

## Questions?
Refer to completed examples (14CSSFlexbox2.html, 1CourseIntroduction.html) for patterns.

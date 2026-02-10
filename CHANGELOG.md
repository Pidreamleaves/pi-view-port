# Changelog

All notable changes to this project will be documented in this file.

## [0.1.1] - 2026-02-08

### Added
- Initial release of `pi-view-port` package.
- Support for PDF, Markdown, HTML, Image, Video, Audio preview.
- Support for Office documents (Word, Excel, PPT) via OnlyOffice WASM.
- Theme support (Light/Dark).
- TypeScript definitions.


## [0.1.2] - 2026-02-08

### Added
- Updated README documentation.

## [0.1.3] - 2026-02-10

### Fixed
- Fixed an issue where OnlyOffice editors would initialize in editable mode even when configured as read-only.

### Added
- Exposed `save()` method in OnlyOffice sub-components (`OnlyOfficeDoc`, `OnlyOfficeXls`, `OnlyOfficePpt`) to allow manual save triggering via component ref.
- Updated README documentation with manual save usage examples.

## [0.1.4] - 2026-02-10

### Fixed
- Fixed an issue where OnlyOffice theme switching would fail in WASM mode by enforcing localStorage settings and runtime commands.

### Refactored
- Simplified theme control logic by removing the redundant `isDark` prop. The `theme` prop ('light' | 'dark' | 'auto') now handles all theme scenarios.

## [0.1.5] - 2026-02-11

### Fixed
- Fixed missing type definitions for the Vite plugin.
- Fixed an issue where Office documents could not be previewed due to resource loading errors.


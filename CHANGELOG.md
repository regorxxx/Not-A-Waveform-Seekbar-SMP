# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [1.0.4](#104---2023-09-14)
- [1.0.3](#103---2023-07-29)
- [1.0.2](#102---2023-07-28)
- [1.0.1](#101---2023-06-29)
- [1.0.0](#100---2023-06-27)
- [1.0.0-beta.4](#100-beta4---2023-05-17)
- [1.0.0-beta.3](#100-beta3---2023-05-16)
- [1.0.0-beta.2](#100-beta2---2023-05-10)
- [1.0.0-beta.1](#100-beta1---2023-05-09)

## [Unreleased][]
### Added
### Changed
### Removed
### Fixed

## [1.0.4] - 2023-09-14
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [1.0.3] - 2023-07-29
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [1.0.2] - 2023-07-28
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed
- Fix for non [standard hyphen chars](https://jakubmarian.com/hyphen-minus-en-dash-and-em-dash-difference-and-usage-in-english/) on path names.

## [1.0.1] - 2023-06-29
### Added
### Changed
### Removed
### Fixed
- Helpers: fixed incorrect warning about missing font.

## [1.0.0] - 2023-06-27
### Added
- UI: new option to normalize waveform points width, independent of the track length, instead of having smaller points for longer tracks and bigger points for shorter ones. Desired width is configurable (it may not exactly adjust to it, and should be taken as an approx. value).
### Changed
- UI: half-bars style did not paint negative points (omitted them instead of painting them inverted). It looked fine on previous usage cases (since bars were too small), but with the new 'normalize width' option there were cases with visible blank spaces. A new option has been added to revert back to the old behavior with negative values being omitted, which may look better in some settings (only available for half-bars style).
- UI: optimized painting -without normalization enabled- with really long tracks (> 10 min). In case points would overlap, they are now skipped. This avoids painting too many points when fewer would render the same waveform, thus reducing the CPU usage.
- Analysis: new tracks are only analyzed/displayed 1 sec after playback starts (to avoid excessive CPU usage when previewing/skipping a lot of consecutive tracks). Other scripts should use newTrackQueue() instead of newTrack() to use this feature.
- Analysis: improved exotic filename parsing for ffprobe. Thanks @TT-ReBORN.
### Removed
### Fixed
- Analysis: enhanced data validation in some corner cases, for ex. previewing/skipping a lot of consecutive tracks (which made the panel crash at some point due to corrupted data). Now this data is also discarded. This is in addition to the other changes to avoid this situation.

## [1.0.0-beta.4] - 2023-05-18
### Added
- Animation: added new option to completely disable animation on 'partial' mode.
### Changed
- Menu: reworked and simplified menu options (similar to Georgia-ReBORN).
### Removed
### Fixed

## [1.0.0-beta.3] - 2023-05-16
### Added
### Changed
- Portable: expanded binaries path verification to standard script installation.
### Removed
### Fixed
- Animation: panel is not repainted (and thus animated) while track is paused.

## [1.0.0-beta.2] - 2023-05-10
### Added
### Changed
### Removed
### Fixed
- UI: top margin not being respect in some cases.
- Menu: check for 'Enable seekbar' menu entry not working.
- Data: data verification failing on Audiowaveform mode.

## [1.0.0-beta.1] - 2023-05-09
### Added
- First beta release.
### Changed
### Removed
### Fixed


[Unreleased]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.4...HEAD
[1.0.4]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.4...v1.0.0
[1.0.0-beta.4]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/5ae07355...v1.0.0-beta.1
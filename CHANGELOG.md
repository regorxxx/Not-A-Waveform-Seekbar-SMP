# Changelog

## [Table of Contents]
- [Unreleased](#unreleased)
- [2.6.0](#260---2024-10-09)
- [2.5.1](#251---2024-08-13)
- [2.5.0](#250---2024-07-30)
- [2.4.0](#240---2024-07-24)
- [2.3.0](#230---2024-03-21)
- [2.2.0](#220---2024-03-15)
- [2.1.0](#210---2024-02-28)
- [2.0.0](#200---2023-12-17)
- [1.4.0](#140---2023-12-11)
- [1.3.1](#131---2023-12-08)
- [1.3.0](#130---2023-11-28)
- [1.2.1](#121---2023-11-24)
- [1.2.0](#120---2023-11-15)
- [1.1.0](#110---2023-10-05)
- [1.0.6](#106---2023-09-25)
- [1.0.5](#105---2023-09-20)
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
- UI: added scrolling using the mouse wheel (horizontal or vertical). Seek ahead/back steps, unit (s, ms or % of length) and reverse scrolling may be tweaked at the settings (see 'Other settings').
- Readme: readme is shown as popup on first installation and available at the settings menu.
### Changed
- Analysis: default TF path pattern for analysis files changed to better handle track with multiple artists and some errors with unwanted spaces. Use this on existing installations (without quotes=: '$replace($ascii($lower([$replace($if2($meta(ALBUMARTIST,0),$meta(ARTIST,0)),\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))), ?,,= ,,?,)'
- Readme: added FAQ section.
- Helpers: updated helpers.
### Removed
### Fixed
- UI: '&' being displayed as '_' on tooltips.

## [2.6.0] - 2024-10-09
### Added
- Analysis: expanded the list of compatible files with ffprobe. Thanks @TT-ReBORN.
- UI: new menu entry which shows if the currently playing (or focused) item is incompatible with the binary mode chosen and also shows a popup with the list of extensions supported.
### Changed
- Analysis: default TF path pattern for analysis files now removes/replaces any non ASCII value on new installations.
- [JSplitter (SMP)](https://foobar2000.ru/forum/viewtopic.php?t=6378&start=360) support and ES2021 compatibility.
- Helpers: in case saving a file throws an error due to long paths (+255 chars) a warning popup will be shown.
- Helpers: updated helpers.
### Removed
### Fixed
- UI: compressed files don't display neither an "incompatible format" nor the visualizer as fallback.
- UI: 'Visualizer during analysis' setting was overriding the 'Visualizer for incompatible files' in some cases, displaying the visualizer indefinitely for incompatible files (and not just during the analysis).

## [2.5.1] - 2024-08-13
### Added
### Changed
- Helpers: updated helpers
### Removed
### Fixed

## [2.5.0] - 2024-07-30
### Added
### Changed
- UI: minimum size of data points is now set to 1px (for any style) instead of 0.5px to be on the safer side when implemented on slow systems or other SMP themes.
- UI: cleanup of submenu names.
- Helpers: updated helpers.
### Removed
### Fixed
- UI: duplicated background submenu.
- UI: refresh rate submenu not showing the actual setting used (with a check).

## [2.4.0] - 2024-07-24
### Added
- UI: added album art caching for panel background whenever selecting/playing track changes but belongs to the same album. It checks for same album name and parent directory. 
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting for console logging to file. Disabled by default. Now this is a change from the previous behavior, where console was always logged to 'console.log' file at the [FOOBAR PROFILE FOLDER]. It can now be switched, but since it's probably not useful for most users is disabled by default.
### Changed
- Helpers: updated helpers.
### Removed
### Fixed
- Configuration: .json files at 'foobar2000\js_data\presets\global' not being saved with the calculated properties based on user values from other files.
## [2.3.0] - 2024-03-21
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [2.2.0] - 2024-03-15
### Added
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting for panel repaint debugging purpose. Disabled by default.
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting to check OS features on every panel startup. Enabled by default. This has been the default behavior since OS' features check was implemented, but it can now be disabled to improve init performance a bit, specially at foobar2000 startup (since it seems to hang in some cases when running it on slow HDDs or systems).
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [2.1.0] - 2024-02-28
### Added
- Configuration: added integrity checks to global user settings files, found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\[...].json'. In particular queries are now check to ensure they are valid and will throw a popup at init otherwise. Other settings are check to ensure they contain valid values too.
- Configuration: expanded user configurable file at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json' with a new setting to output to console profiling logs at script init. They work globally. Disabled by default.
### Changed
- Helpers: updated helpers.
- Console: improved log file formatting on windows text editors which parse new lines only with CR+LF instead of LF.
- Update audiowaveform binaries to 1.9.1.
- Code cleanup.
### Removed
### Fixed
- Minor fixes.

## [2.0.0] - 2023-12-17
### Added
- UI: color settings for the current position indicator.
- UI: transparency settings for all UI elements.
- UI: new implementation of background settings, equal to the one found at [Timeline-SMP](https://github.com/regorxxx/Timeline-SMP), which allows to use covers, colors, gradients, etc. This is in addition to the background for the waveform, which is painted on top (so they can be mixed).
### Changed
- UI: changed defaults settings on new installations for a more modern look.
- UI: on partial mode, the background after current position is now displayed too (without needing to use 'paint after current'). To hide it (previous behavior) set color to none or transparency to 0
- UI: optimized repainting to use less resources.
- UI: performance improvements when some elements are disabled due to color set to none or transparency set to 0.
### Removed
### Fixed
- UI: 'Enable animation' menu entry is now grayed out on visualizer mode, since it's always active by design. It will also show a check in such case no matter the settings saved (at other modes).

## [1.4.0] - 2023-12-11
### Added
- UI: added settings to tweak the desired refresh rate.
- UI: added entries to set custom colors at the color presets menu.
### Changed
- UI: improved color presets menu.
### Removed
### Fixed
- UI: long time bug in some cases where the current position was not properly painted (in width).

## [1.3.1] - 2023-12-08
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [1.3.0] - 2023-11-28
### Added
- UI: added setting to disable tooltip on all scripts. Found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json', by changing 'bTooltip'. By default tooltip is always shown. This setting will never be exposed within foobar, only at this file.
### Changed
- Helpers: updated helpers.
- Improved error messages about features not working related to OS checks (at startup) with tips and warnings.
### Removed
### Fixed

## [1.2.1] - 2023-11-24
### Added
### Changed
- Console: reduced max log file size to 1 MB.
- Helpers: updated helpers.
### Removed
### Fixed

## [1.2.0] - 2023-11-15
### Added
- Auto-update: added -optional- automatic checks for updates on script load; enabled by default. Compares version of current file against GitHub repository. Manual checking can also be found at the settings menu. Setting may also be globally switched at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json', by changing 'bAutoUpdateCheck'. It will apply by default to any new installed script (previous scripts will still need to be manually configured to change them).
- Added setting to disable popups related to features not being supported by the OS (at startup). Found at '[FOOBAR PROFILE FOLDER]\js_data\presets\global\globSettings.json', by changing 'bPopupOnCheckSOFeatures'. By default popups are always shown. This setting will never be exposed within foobar, only at this file.
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [1.1.0] - 2023-10-05
### Added
### Changed
- Configuration: expanded user configurable files at '[FOOBAR PROFILE FOLDER]\js_data\presets\global' with new queries. File will be automatically updated with new values (maintaining the user settings).
- Configuration: improved the user configurable files update check for missing keys.
- Helpers: updated helpers.
### Removed
### Fixed

## [1.0.6] - 2023-09-25
### Added
### Changed
- Helpers: updated helpers.
### Removed
### Fixed

## [1.0.5] - 2023-09-20
### Added
### Changed
- Helpers: updated helpers.
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


[Unreleased]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.6.0...HEAD
[2.6.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.5.1...v2.6.0
[2.5.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.5.0...v2.5.1
[2.5.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.4.0...v2.5.0
[2.4.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.3.0...v2.4.0
[2.3.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.2.0...v2.3.0
[2.2.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.4.01...v2.0.0
[1.4.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.3.1...v1.4.0
[1.3.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.6...v1.1.0
[1.0.6]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.4...v1.0.0
[1.0.0-beta.4]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.3...v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.2...v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/v1.0.0-beta.1...v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/5ae07355...v1.0.0-beta.1
[1.0.0-beta.1]: https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/compare/5ae07355...v1.0.0-beta.1
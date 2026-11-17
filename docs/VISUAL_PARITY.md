# Visual parity status

**Status: implemented in source · pending CI screenshot approval.** All 17 screens are implemented with dedicated components, tokens from `design-tokens.json`, and Tailwind theme extensions. The internal `/dev/states` route allows previewing and exercising each screen state with controlled conditions. Official baseline approvals and automated pixel-diff checks remain to be run in GitHub Actions per the project rules.

| Screen                     | Reference folder                  | Implementation status · baseline status                   |
| -------------------------- | --------------------------------- | --------------------------------------------------------- |
| 1. Splash                  | `splash_screen_locapharm`         | Implemented (rings, brand, live pill) · baseline pending  |
| 2. Onboarding              | `onboarding_3_tapes`              | Implemented (3-step carousel, isometric) · baseline pending |
| 3. Location permission     | `permission_localisation`         | Implemented (prompt, denied, manual area) · baseline pending |
| 4. Pharmacy map            | `carte_des_pharmacies`            | Implemented (MapLibre vector, 3D tilt, SAMU) · baseline pending |
| 5. Collapsed list skeleton | `carte_liste_d_pli_e_85_skeleton` | Implemented (85% sheet, skeleton pulses) · baseline pending |
| 6. Dark map                | `carte_mode_sombre_dark_theme`    | Implemented (dark tokens #161b19, lime neon) · baseline pending |
| 7. Filters bottom sheet    | `filtres_bottom_sheet`            | Implemented (1-20km slider, duty, sort) · baseline pending |
| 8. Search suggestions      | `recherche_suggestions`           | Implemented (covered cities, recent, 0-result) · baseline pending |
| 9. Pharmacy details        | `d_tail_pharmacie_du_centre`      | Implemented (hero map, hours, call, share) · baseline pending |
| 10. Duty-pharmacy selector | `pharmacies_de_garde_s_lecteur`   | Implemented (fresh, stale warning, city picker) · baseline pending |
| 11. Favorites              | `favoris_gestion_des_officines`   | Implemented (offline emergency carnet, swipe) · baseline pending |
| 12. Settings               | `param_tres_r_glages`             | Implemented (language FR/EN, theme, offline packs) · baseline pending |
| 13. Report an issue        | `signaler_une_erreur`             | Implemented (multi-choice, consent, confirmation) · baseline pending |
| 14. 3D route preview       | `aper_u_d_itin_raire_3d`          | Implemented (isometric SVG, 3 modes, alternatives) · baseline pending |
| 15. Live GPS guidance      | `guidage_gps_en_direct`           | Implemented (maneuvers, 3D heading, recalcul, weak GPS) · baseline pending |
| 16. Arrival confirmation   | `cran_d_arriv_e_confirmation`     | Implemented (arrival check, community vote 👍/👎) · baseline pending |
| 17. System/network status  | `tats_syst_me_r_seau`             | Implemented (offline cache, 503 error, 1st launch) · baseline pending |

Dev lab route: `/dev/states` allows exercising all 17 screens interactively. No screen is marked approved until a CI screenshot is reviewed by Paul and baselines are saved in `tests/visual/baselines/`.

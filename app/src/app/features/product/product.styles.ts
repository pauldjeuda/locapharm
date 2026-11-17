export const productPageStyles = `
  :host { display: block; min-height: 100%; }
  .lp-screen {
    box-sizing: border-box;
    min-height: 100dvh;
    padding: max(20px, env(safe-area-inset-top)) 20px calc(112px + env(safe-area-inset-bottom));
    color: var(--lp-on-surface);
    background: var(--lp-surface-map);
    font-family: Inter, sans-serif;
  }
  .lp-screen--plain { padding-bottom: calc(32px + env(safe-area-inset-bottom)); }
  .lp-screen--immersive {
    display: grid;
    min-height: 100dvh;
    place-items: center;
    padding: max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom));
    color: #fff;
    background: radial-gradient(ellipse at 50% 42%, #5b7a4e 0%, #3f5a36 52%, #31492c 100%);
  }
  .lp-screen--sheet { padding-top: max(12px, env(safe-area-inset-top)); }
  .lp-topline, .lp-row, .lp-row-between { display: flex; align-items: center; gap: 12px; }
  .lp-row-between { justify-content: space-between; }
  .lp-topline { margin-bottom: 20px; }
  .lp-heading { margin: 0; font: 700 24px/1.15 Syne, sans-serif; letter-spacing: -.025em; }
  .lp-heading--large { font-size: clamp(30px, 9vw, 40px); line-height: 1.05; }
  .lp-title-group { display: grid; gap: 6px; }
  .lp-eyebrow { margin: 0; color: var(--lp-on-surface-variant); font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  .lp-copy { margin: 0; color: var(--lp-on-surface-variant); font-size: 14px; line-height: 1.5; }
  .lp-copy--small { font-size: 12px; }
  .lp-muted { color: #73796e; }
  .lp-stack { display: grid; gap: 16px; }
  .lp-card {
    padding: 20px;
    border-radius: 28px;
    background: #fff;
    box-shadow: 0 4px 20px rgb(18 22 26 / 4%), 0 1px 4px rgb(18 22 26 / 2%);
  }
  .lp-card--soft { background: #f1f4f9; box-shadow: none; }
  .lp-card--dark { color: #fff; background: #0f1110; }
  .lp-card--sage { color: #fff; background: #3f5a36; }
  .lp-pill, .lp-chip, .lp-badge, .lp-button, .lp-icon-button { border: 0; border-radius: 9999px; }
  .lp-pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; background: #fff; color: var(--lp-on-surface); font-size: 11px; font-weight: 700; letter-spacing: .05em; }
  .lp-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #c8f000; }
  .lp-chip-row { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 8px; scrollbar-width: none; }
  .lp-chip { display: inline-flex; min-height: 36px; flex: 0 0 auto; align-items: center; gap: 8px; padding: 0 14px; background: #fff; color: #5e656b; font: 600 12px/1 Inter, sans-serif; }
  .lp-chip[aria-pressed="true"] { color: #fff; background: #0f1110; }
  .lp-chip[aria-pressed="true"]::before { width: 6px; height: 6px; border-radius: 50%; background: #c8f000; content: ""; }
  .lp-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 0 11px; background: #e2e4e6; color: #5e656b; font-size: 10px; font-weight: 700; letter-spacing: .06em; white-space: nowrap; }
  .lp-badge--duty { color: #fff; background: #3f5a36; }
  .lp-badge--open { color: #c8f000; background: #0f1110; }
  .lp-text-link { color: #3f5a36; font-size: 12px; font-weight: 700; text-decoration: none; }
  .lp-button { display: inline-flex; min-height: 52px; align-items: center; justify-content: center; gap: 10px; padding: 0 20px; color: #fff; background: #0f1110; font: 600 14px/1 Inter, sans-serif; text-decoration: none; cursor: pointer; }
  .lp-button--full { width: 100%; }
  .lp-button--sage { background: #5b7a4e; }
  .lp-button--light { color: #0f1110; background: #fff; }
  .lp-button:disabled { opacity: .5; cursor: not-allowed; }
  .lp-icon-button { display: inline-grid; width: 44px; height: 44px; flex: 0 0 44px; place-items: center; color: #12161a; background: #fff; box-shadow: 0 8px 24px rgb(18 22 26 / 8%); text-decoration: none; cursor: pointer; }
  .lp-icon-button--dark { color: #fff; background: #0f1110; }
  .lp-input { box-sizing: border-box; width: 100%; min-height: 54px; padding: 0 18px; border: 0; border-radius: 9999px; outline: 2px solid transparent; color: #181c20; background: #fff; font: 400 14px/1.4 Inter, sans-serif; box-shadow: 0 4px 20px rgb(18 22 26 / 4%); }
  .lp-input:focus-visible, .lp-button:focus-visible, .lp-chip:focus-visible, .lp-icon-button:focus-visible, a:focus-visible { outline: 3px solid #5b7a4e; outline-offset: 3px; }
  .lp-label { display: grid; gap: 8px; color: var(--lp-on-surface); font-size: 12px; font-weight: 600; }
  .lp-section { display: grid; gap: 12px; margin-top: 24px; }
  .lp-section-title { margin: 0; font: 700 17px/1.25 Syne, sans-serif; }
  .lp-separator { height: 1px; border: 0; background: rgb(94 101 107 / 12%); }
  .lp-spacer { flex: 1; }
  .lp-brand { display: grid; justify-items: center; gap: 14px; text-align: center; }
  .lp-brand-mark { display: grid; width: 82px; height: 82px; place-items: center; border-radius: 28px; background: rgb(255 255 255 / 12%); }
  .lp-brand-mark img { width: 52px; height: 52px; }
  .lp-brand-name { margin: 0; font: 800 clamp(36px, 10vw, 54px)/1 Syne, sans-serif; letter-spacing: -.065em; }
  .lp-caption { margin: 0; color: #e8ffd9; font-size: 10px; font-weight: 700; letter-spacing: .15em; }
  .lp-empty { display: grid; min-height: 260px; align-content: center; justify-items: center; gap: 14px; text-align: center; }
  .lp-empty-icon { display: grid; width: 54px; height: 54px; place-items: center; border-radius: 20px; color: #3f5a36; background: #e8ffd9; font-size: 25px; }
  .lp-setting { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 56px; }
  .lp-setting-copy { display: grid; gap: 4px; }
  .lp-select { min-height: 42px; padding: 0 34px 0 14px; border: 0; border-radius: 9999px; color: #181c20; background: #f1f4f9; font: 600 12px Inter, sans-serif; }
  .lp-range { width: 100%; accent-color: #3f5a36; }
  .lp-nav {
    position: fixed; z-index: 20; right: 24px; bottom: max(16px, env(safe-area-inset-bottom)); left: 24px;
    display: flex; justify-content: space-around; gap: 4px; padding: 7px 8px; border-radius: 9999px;
    background: #0f1110; box-shadow: 0 12px 36px rgb(0 0 0 / 25%);
  }
  .lp-nav a { display: grid; min-width: 48px; min-height: 48px; place-items: center; border-radius: 9999px; color: #9aa0a6; font-size: 10px; text-decoration: none; }
  .lp-nav a span { font-size: 19px; line-height: 1; }
  .lp-nav a.active { color: #0f1110; background: #fff; }
  .lp-nav a.active span { color: #0f1110; }
  .lp-emergency-shortcut { position: fixed; z-index: 21; right: 26px; bottom: max(82px, calc(78px + env(safe-area-inset-bottom))); display: inline-flex; min-height: 42px; align-items: center; gap: 8px; padding: 0 15px; border: 2px solid #0f1110; border-radius: 9999px; color: #0f1110; background: #c8f000; box-shadow: 0 8px 24px rgb(18 22 26 / 16%); font-size: 12px; font-weight: 700; text-decoration: none; }
  .lp-emergency-shortcut span { font-size: 17px; }
  .theme-dark .lp-emergency-shortcut { border-color: #caf208; color: #0f1110; background: #caf208; }
  .lp-onboarding-card { display: grid; width: min(100%, 430px); min-height: min(690px, calc(100dvh - 40px)); grid-template-rows: auto 1fr auto; padding: 22px; border-radius: 36px; color: #181c20; background: #fff; }
  .lp-illustration { display: grid; min-height: 220px; place-items: center; color: #3f5a36; }
  .lp-illustration svg { width: min(78%, 250px); height: auto; }
  .lp-onboarding-content { display: grid; align-content: center; gap: 16px; }
  .lp-progress { display: flex; justify-content: center; gap: 7px; padding: 20px 0; }
  .lp-progress span { width: 7px; height: 7px; border-radius: 99px; background: #d7dae0; }
  .lp-progress span.active { width: 28px; background: #5b7a4e; }
  .lp-onboarding-actions { display: flex; align-items: center; gap: 12px; }
  .lp-warning { color: #43483f; background: #f1f4f9; }
  .lp-tabs-outlet { min-height: 100dvh; }
  @media (max-width: 380px) { .lp-screen { padding-right: 16px; padding-left: 16px; } .lp-card { padding: 16px; } }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
  .theme-dark .lp-screen { color: #fff; background: #161b19; }
  .theme-dark .lp-card { color: #fff; background: #1f2522; }
  .theme-dark .lp-card--soft { background: #29302c; }
  .theme-dark .lp-input, .theme-dark .lp-select { color: #fff; background: #29302c; }
  .theme-dark .lp-chip { color: #d7dae0; background: #1f2522; }
  .theme-dark .lp-chip[aria-pressed="true"] { color: #0f1110; background: #caf208; }
  .theme-dark .lp-button { color: #0f1110; background: #caf208; }
  .theme-dark .lp-button--sage { color: #fff; background: #3f5a36; }
  .theme-dark .lp-button--light { color: #0f1110; background: #fff; }
  .theme-dark .lp-icon-button { color: #fff; background: #1f2522; }
  .theme-dark .lp-nav { background: #000; }
  .theme-dark .lp-nav a.active { color: #0f1110; background: #caf208; }
  .theme-dark .lp-onboarding-card { color: #fff; background: #1f2522; }

  /* 3D Route Preview (Screen 14) */
  .lp-route-screen { display: grid; gap: 16px; padding-bottom: 24px; }
  .lp-route-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
  .lp-route-viewport {
    position: relative; width: 100%; height: 320px; overflow: hidden; border-radius: 28px;
    background: #d7dae0; box-shadow: 0 4px 20px rgb(18 22 26 / 8%);
  }
  .lp-route-summary-pill {
    position: absolute; top: 12px; left: 16px; z-index: 10; display: inline-flex; align-items: center;
    gap: 8px; padding: 6px 14px; border-radius: 9999px; background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px); color: #181c20; font-size: 11px; font-weight: 700;
  }
  .lp-route-svg { width: 100%; height: 100%; }
  .lp-dash-animated { animation: lp-dash-flow 1.2s linear infinite; }
  @keyframes lp-dash-flow { to { stroke-dashoffset: -40; } }
  .lp-route-card { display: grid; gap: 16px; border-radius: 32px; }
  .lp-route-metric-group { display: grid; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid rgb(94 101 107 / 12%); }
  .lp-route-big-duration { margin: 0; font: 800 36px/1.1 Syne, sans-serif; letter-spacing: -0.03em; color: var(--lp-on-surface); }
  .lp-route-option {
    display: grid; gap: 4px; padding: 14px 16px; border: 2px solid transparent; border-radius: 20px;
    background: #f1f4f9; text-align: left; cursor: pointer; transition: all 0.2s;
  }
  .lp-route-option.active { border-color: #0f1110; background: #fff; box-shadow: 0 4px 16px rgb(18 22 26 / 6%); }
  .lp-route-warning { border-left: 4px solid #c7ef00; }
  .lp-route-actions { display: flex; align-items: center; gap: 12px; }
  .lp-icon-button--phone { background: #3f5a36; color: #fff; }
  .lp-route-fallback-btn { display: inline-block; text-align: center; margin-top: 4px; }

  /* Live Guidance (Screen 15) */
  .lp-nav-live-screen {
    display: grid; grid-template-rows: auto 1fr auto; gap: 14px; min-height: 100dvh;
    padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
  }
  .lp-maneuver-banner {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 16px 20px; border-radius: 24px; color: #fff; background: #0f1110;
    box-shadow: 0 8px 32px rgb(0 0 0 / 20%);
  }
  .lp-maneuver-banner--reroute { background: #ba1a1a; }
  .lp-maneuver-banner--weak { background: #536500; }
  .lp-maneuver-left { display: flex; align-items: center; gap: 14px; }
  .lp-maneuver-icon { font-size: 32px; font-weight: 700; color: #c8f000; line-height: 1; }
  .lp-maneuver-text { display: grid; gap: 2px; }
  .lp-maneuver-dist { margin: 0; font: 800 22px/1.1 Syne, sans-serif; color: #fff; }
  .lp-maneuver-sub { margin: 0; font-size: 13px; color: #e0e3e8; }
  .lp-maneuver-next { font-size: 11px; font-weight: 600; color: #9aa0a6; text-align: right; }
  .lp-nav-perspective-container {
    position: relative; width: 100%; min-height: 280px; overflow: hidden; border-radius: 28px;
    background: #d7dae0;
  }
  .lp-nav-tilted-ground {
    position: absolute; inset: 0; width: 100%; height: 100%;
    transform: perspective(600px) rotateX(42deg) translateY(-20px) scale(1.15);
    transform-origin: 50% 85%;
  }
  .lp-nav-svg-ground { width: 100%; height: 100%; opacity: 0.75; }
  .lp-nav-user-puck {
    position: absolute; left: 50%; top: 480px; transform: translate(-50%, -50%);
    display: flex; align-items: center; justify-content: center;
  }
  .lp-nav-beam-cone {
    position: absolute; top: -110px; width: 120px; height: 110px;
    background: linear-gradient(to top, rgba(200, 240, 0, 0.45), rgba(200, 240, 0, 0));
    clip-path: polygon(50% 100%, 15% 0%, 85% 0%); pointer-events: none;
  }
  .lp-nav-radar-halo { position: absolute; width: 64px; height: 64px; border-radius: 50%; background: rgba(200, 240, 0, 0.4); }
  .lp-nav-core-puck {
    position: relative; width: 28px; height: 28px; border-radius: 50%; background: #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25); display: grid; place-items: center;
  }
  .lp-nav-heading-arrow { font-size: 12px; color: #0f1110; line-height: 1; }
  .lp-nav-state-switcher {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 10;
    display: flex; gap: 6px; padding: 4px 8px; border-radius: 9999px;
    background: rgba(15, 17, 16, 0.75); backdrop-filter: blur(8px);
  }
  .lp-nav-bottom-panel {
    display: grid; gap: 12px; padding: 18px 20px; border-radius: 28px; background: #fff;
    box-shadow: 0 8px 32px rgb(18 22 26 / 8%);
  }
  .lp-nav-metrics-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
  .lp-nav-speed-badge {
    display: grid; place-items: center; min-width: 54px; min-height: 54px; border-radius: 18px;
    background: #0f1110; color: #c8f000; text-align: center;
  }
  .lp-nav-speed-val { font: 800 20px/1 Syne, sans-serif; }
  .lp-nav-speed-unit { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .lp-nav-time-group { display: grid; gap: 2px; }
  .lp-nav-big-eta { font: 800 24px/1.1 Syne, sans-serif; color: #181c20; }
  .lp-nav-dest-card {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 14px; border-radius: 18px; background: #f1f4f9;
  }
  .lp-nav-dest-copy { display: grid; gap: 2px; }

  /* Arrival & Confirmation (Screen 16) */
  .lp-arrival-screen-full { display: grid; gap: 16px; padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom)); }
  .lp-arrival-topbar { margin-bottom: 4px; }
  .lp-arrival-viewport {
    position: relative; width: 100%; height: 220px; overflow: hidden; border-radius: 28px;
    background: #ebeef4; display: grid; place-items: center;
  }
  .lp-arrival-ripple-cluster { position: relative; display: grid; place-items: center; }
  .lp-arrival-ping-1 {
    position: absolute; width: 160px; height: 160px; border-radius: 50%;
    background: rgba(200, 240, 0, 0.25); animation: lp-pulse-ring 3.2s infinite;
  }
  .lp-arrival-ping-2 {
    position: absolute; width: 110px; height: 110px; border-radius: 50%;
    background: rgba(200, 240, 0, 0.35); animation: lp-pulse-ring 2.1s infinite 0.6s;
  }
  .lp-arrival-glow-halo { width: 70px; height: 70px; border-radius: 50%; background: rgba(200, 240, 0, 0.4); filter: blur(4px); }
  @keyframes lp-pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    50% { transform: scale(1.35); opacity: 0.15; }
    100% { transform: scale(0.8); opacity: 0.8; }
  }
  .lp-arrival-marker-anchor {
    position: absolute; display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .lp-arrival-dest-pill { background: #0f1110; color: #c8f000; font-size: 9px; }
  .lp-arrival-building-marker {
    width: 44px; height: 44px; border-radius: 14px; background: #3f5a36;
    color: #fff; display: grid; place-items: center; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  .lp-arrival-cross { font-size: 22px; line-height: 1; }
  .lp-arrival-sheet {
    display: grid; gap: 16px; padding: 20px; border-radius: 32px; background: #fff;
    box-shadow: 0 8px 32px rgb(18 22 26 / 8%);
  }
  .lp-arrival-header-block { display: grid; justify-items: center; text-align: center; gap: 8px; }
  .lp-arrival-big-check {
    width: 60px; height: 60px; border-radius: 50%; background: #c8f000; color: #0f1110;
    font-size: 30px; font-weight: 800; display: grid; place-items: center; box-shadow: 0 4px 16px rgba(200, 240, 0, 0.4);
  }
  .lp-arrival-pharmacy-info { display: grid; gap: 2px; }
  .lp-arrival-notice { border-left: 4px solid #3f5a36; }
  .lp-arrival-community-card { display: grid; gap: 12px; background: #f1f4f9; padding: 18px; border-radius: 24px; }
  .lp-arrival-vote-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .lp-chip--vote-yes { justify-content: center; background: #c7ef00; color: #0f1110; font-weight: 700; }
  .lp-chip--vote-yes.voted { background: #3f5a36; color: #fff; }
  .lp-chip--vote-no { justify-content: center; background: #e0e3e8; color: #181c20; }
  .lp-chip--vote-no.voted { background: #ba1a1a; color: #fff; }
  .lp-arrival-vote-thanks {
    display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 14px;
    background: #e8ffd9; color: #3f5a36; font-size: 13px;
  }
  .lp-arrival-footer-link { text-align: center; padding-top: 6px; }

  .theme-dark .lp-route-viewport, .theme-dark .lp-nav-perspective-container, .theme-dark .lp-arrival-viewport { background: #161b19; }
  .theme-dark .lp-route-option { background: #29302c; color: #fff; }
  .theme-dark .lp-route-option.active { border-color: #caf208; background: #1f2522; }
  .theme-dark .lp-nav-bottom-panel, .theme-dark .lp-arrival-sheet { background: #1f2522; color: #fff; }
  .theme-dark .lp-nav-dest-card, .theme-dark .lp-arrival-community-card { background: #29302c; color: #fff; }
  .theme-dark .lp-nav-big-eta { color: #fff; }
  .theme-dark .lp-arrival-vote-thanks { background: #29302c; color: #caf208; }
`;

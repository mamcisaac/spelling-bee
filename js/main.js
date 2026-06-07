/* ===========================================================================
   main.js — Boots the game once everything is loaded.
   =========================================================================== */
(function () {
  "use strict";
  function boot() {
    // Apply saved audio settings.
    SB.audio.applySettings(SB.state.get().settings);
    SB.ui.init();
    SB.ui.show("home");

    // Keep speech from running on after navigating away / closing.
    window.addEventListener("pagehide", () => SB.audio.cancelVoice());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) SB.audio.cancelVoice();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

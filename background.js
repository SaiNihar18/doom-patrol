// background.js
// Doom Patrol Background Service
// -----------------------------
// Privacy Note: All storage and processing is handled 100% locally.
// No tracking data leaves the user's browser.

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings
  chrome.storage.sync.get(["monitoredSites", "reminderTimeMins", "scrollDetectionEnabled", "overlayEnabled", "frictionEnabled"], (res) => {
    if (!res.monitoredSites) {
      chrome.storage.sync.set({
        monitoredSites: {
          instagram: true,
          youtube: true,
          twitter: false,
          reddit: false
        },
        reminderTimeMins: 7,
        scrollDetectionEnabled: true,
        overlayEnabled: true,
        frictionEnabled: false // The optional friction challenge
      });
    }
  });

  // Reset daily usage at start
  resetDailyUsage();
});

function resetDailyUsage() {
  const defaultUsage = {
    instagram: 0,
    youtube: 0,
    twitter: 0,
    reddit: 0,
    total: 0
  };
  chrome.storage.local.set({ dailyUsage: defaultUsage, dateStamp: new Date().toDateString() });
}

// Alarm to check if usage needs a midnight reset
chrome.alarms.create("midnightResetCheck", { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "midnightResetCheck") {
    chrome.storage.local.get(["dateStamp"], (res) => {
      if (res.dateStamp !== new Date().toDateString()) {
        resetDailyUsage();
      }
    });
  }
});

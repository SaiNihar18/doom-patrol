// content.js
// Injectable Scroll & Time Tracker for Doom Patrol

let scrollCount = 0;
let lastScrollTime = Date.now();
let activeSite = "";
let scrollTimer = null;
let pausedVideos = [];

// Active-time tracking (only counts while tab is visible and focused)
let activeSessionMs = 0;    // accumulated active ms for the reminder timer
let tabActiveStart = null;  // timestamp when the current active window started
let dailyActiveMs = 0;      // accumulated active ms for the current 1-min tally bucket
let dailyBucketStart = null;

function getActiveSessionMins() {
    const live = (tabActiveStart !== null) ? (Date.now() - tabActiveStart) : 0;
    return (activeSessionMs + live) / 60000;
}

function getDailyBucketMins() {
    const live = (dailyBucketStart !== null) ? (Date.now() - dailyBucketStart) : 0;
    return (dailyActiveMs + live) / 60000;
}

const memes = ["memes/stop1.jpg", "memes/stop2.jpg", "memes/stop3.jpg"];
const roasts = [
    "bro... that was the 63rd reel.",
    "you opened this app for 1 minute... 8 minutes ago.",
    "even shaq says stop.",
    "that reel wasn't even funny.",
    "your attention span is screaming for help.",
    "go touch grass.",
    "just put the fries in the bag bro.",
    "are we really doing this again?",
    "you said 'just one reel'."
];

// Determine active site
if (window.location.hostname.includes("instagram.com")) activeSite = "instagram";
if (window.location.hostname.includes("youtube.com")) activeSite = "youtube";
if (window.location.hostname.includes("twitter.com") || window.location.hostname.includes("x.com")) activeSite = "twitter";
if (window.location.hostname.includes("reddit.com")) activeSite = "reddit";

// Load settings
chrome.storage.sync.get(["monitoredSites", "reminderTimeMins", "scrollDetectionEnabled", "overlayEnabled"], (res) => {
    if (res.monitoredSites && res.monitoredSites[activeSite]) {
        // Start counters only if the tab is already visible
        if (!document.hidden) {
            tabActiveStart = Date.now();
            dailyBucketStart = Date.now();
        }

        // Pause/resume counters when tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab went to background — freeze both counters
                if (tabActiveStart !== null) {
                    activeSessionMs += Date.now() - tabActiveStart;
                    tabActiveStart = null;
                }
                if (dailyBucketStart !== null) {
                    dailyActiveMs += Date.now() - dailyBucketStart;
                    dailyBucketStart = null;
                }
            } else {
                // Tab came back to foreground — resume counters
                tabActiveStart = Date.now();
                dailyBucketStart = Date.now();
            }
        });

        setInterval(updateDailyUsage, 60000); // 1-minute tally

        if (res.scrollDetectionEnabled) {
            window.addEventListener('scroll', handleScroll, { passive: true });
            window.addEventListener('wheel', handleScroll, { passive: true });
        }

        if (res.overlayEnabled) {
            setInterval(() => checkTimeLimit(res.reminderTimeMins || 7), 30000);
        }
    }
});

function handleScroll() {
    if (document.hidden) return; // ignore scroll events while backgrounded
    const now = Date.now();
    if (now - lastScrollTime > 1500) {
        scrollCount++;
    }
    lastScrollTime = now;

    // 20 distinct scroll bursts triggers it early
    if (scrollCount >= 20) {
        triggerIntervention("Too many reels too fast. Chill.");
        scrollCount = 0;
    }

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        scrollCount = Math.max(0, scrollCount - 3);
    }, 10000);
}

function checkTimeLimit(limitMins) {
    if (document.hidden || tabActiveStart === null) return; // only fire when tab is active
    const elapsedMins = getActiveSessionMins();
    if (elapsedMins >= limitMins) {
        triggerIntervention(`You've been here for ${Math.round(elapsedMins)} minutes.`);
        // Reset the active-session counter
        activeSessionMs = 0;
        tabActiveStart = Date.now();
    }
}

function updateDailyUsage() {
    // Only tally a minute if the tab was actively used for at least 30s of the last minute
    const activeMins = getDailyBucketMins();
    if (activeMins < 0.5) {
        // Not enough active time — reset bucket without counting
        dailyActiveMs = 0;
        dailyBucketStart = document.hidden ? null : Date.now();
        return;
    }

    // Reset bucket
    dailyActiveMs = 0;
    dailyBucketStart = document.hidden ? null : Date.now();

    chrome.storage.local.get(["dailyUsage"], (res) => {
        let usage = res.dailyUsage || { total: 0 };
        if (!usage[activeSite]) usage[activeSite] = 0;

        usage[activeSite] += 1;
        usage.total += 1;

        chrome.storage.local.set({ dailyUsage: usage });
    });
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function triggerIntervention(reasonText) {
    if (document.getElementById("doom-patrol-root")) return; // Already showing

    // Pause only currently playing videos and save them
    pausedVideos = [];
    document.querySelectorAll('video').forEach(v => {
        if (!v.paused) {
            pausedVideos.push(v);
            v.pause();
        }
    });

    const container = document.createElement('div');
    container.id = "doom-patrol-root";
    container.style.position = "fixed";
    container.style.zIndex = "2147483647";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "auto";
    document.body.appendChild(container);

    const shadow = container.attachShadow({ mode: 'closed' });

    // Load CSS
    const cssUrl = chrome.runtime.getURL('ui/overlay.css');
    const style = document.createElement('link');
    style.rel = "stylesheet";
    style.href = cssUrl;

    // Load HTML
    const htmlUrl = chrome.runtime.getURL('ui/overlay.html');
    try {
        const htmlRes = await fetch(htmlUrl);
        const htmlText = await htmlRes.text();

        const wrapper = document.createElement('div');
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        wrapper.innerHTML = htmlText;

        shadow.appendChild(style);
        shadow.appendChild(wrapper);

        // Setup contents
        const mainContainer = shadow.getElementById("doom-patrol-container");
        const roastEl = shadow.getElementById("dp-roast-text");
        const imgEl = shadow.getElementById("dp-meme-img");

        const randomRoast = getRandomItem(roasts);
        const randomMeme = getRandomItem(memes);

        roastEl.innerText = `${reasonText}\n\n${randomRoast}`;
        imgEl.src = chrome.runtime.getURL(randomMeme);

        // Fade in
        requestAnimationFrame(() => {
            mainContainer.classList.add("visible");
        });

        // Button Bindings
        const btnBreak = shadow.getElementById("dp-btn-break");
        const btnSnooze = shadow.getElementById("dp-btn-snooze");
        const btnIgnore = shadow.getElementById("dp-btn-ignore");

        btnBreak.addEventListener("click", () => {
            window.top.location.href = "https://www.google.com"; // Redirect away
        });

        btnSnooze.addEventListener("click", () => {
            closeOverlay(container, mainContainer);
            // Reset active-session counter so the snooze gives a fresh window
            activeSessionMs = 0;
            tabActiveStart = document.hidden ? null : Date.now();
            scrollCount = 0; // reset scrolls

            // Resume only the videos that were playing
            pausedVideos.forEach(v => v.play().catch(e => console.warn(e)));
            pausedVideos = [];
        });

        btnIgnore.addEventListener("click", () => {
            chrome.storage.sync.get(["frictionEnabled"], (res) => {
                if (res.frictionEnabled) {
                    btnIgnore.innerText = "Wait 3s...";
                    btnIgnore.style.pointerEvents = "none";
                    setTimeout(() => {
                        closeOverlay(container, mainContainer);
                        pausedVideos.forEach(v => v.play().catch(e => console.warn(e)));
                        pausedVideos = [];
                    }, 3000);
                } else {
                    closeOverlay(container, mainContainer);
                    pausedVideos.forEach(v => v.play().catch(e => console.warn(e)));
                    pausedVideos = [];
                }
            });
        });

    } catch (err) {
        console.error("Doom Patrol Overlay Injection Failed", err);
    }
}

function closeOverlay(container, mainContainer) {
    mainContainer.classList.remove("visible");
    setTimeout(() => container.remove(), 500);
}

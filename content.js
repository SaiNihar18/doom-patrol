// content.js
// Injectable Scroll & Time Tracker for Doom Patrol

let scrollCount = 0;
let lastScrollTime = Date.now();
let activeSite = "";
let scrollTimer = null;
let sessionStartTime = null;
let pausedVideos = [];

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
        sessionStartTime = Date.now();
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
    if (!sessionStartTime) return;
    const elapsedMins = (Date.now() - sessionStartTime) / 60000;
    if (elapsedMins >= limitMins) {
        triggerIntervention(`You've been here for ${Math.round(elapsedMins)} minutes.`);
        sessionStartTime = Date.now(); // Reset session
    }
}

function updateDailyUsage() {
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
            sessionStartTime = Date.now(); // reset timer
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

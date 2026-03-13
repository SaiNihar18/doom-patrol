document.addEventListener('DOMContentLoaded', () => {
    const statsList = document.getElementById('stats-list');
    const totalTime = document.getElementById('total-time');
    const btnSettings = document.getElementById('btn-settings');

    const siteIcons = {
        instagram: `<svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
        youtube: `<svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`,
        twitter: `<svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 4l11.73 16h5L9 4H4z"></path></svg>`,
        reddit: `<svg class="stat-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`
    };

    const siteNames = {
        instagram: "Instagram",
        youtube: "YouTube",
        twitter: "X",
        reddit: "Reddit"
    };

    chrome.storage.local.get(["dailyUsage"], (res) => {
        const usage = res.dailyUsage || { total: 0 };

        let html = "";
        Object.keys(usage).forEach(site => {
            if (site !== "total" && site !== "dateStamp" && usage[site] > 0) {
                html += `
          <div class="stat-item">
            <span class="stat-label">${siteIcons[site] || ""}${siteNames[site] || site}</span>
            <span class="stat-value">${usage[site]}m</span>
          </div>
        `;
            }
        });

        if (html === "") {
            html = `<div style="text-align:center; color:#a4b0be; font-size:12px;">No doom-scrolling today! 🎉</div>`;
        }

        statsList.innerHTML = html;
        totalTime.innerText = `${usage.total || 0} mins`;
    });

    btnSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});

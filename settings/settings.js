document.addEventListener('DOMContentLoaded', () => {
    const elInsta = document.getElementById('site-instagram');
    const elYoutube = document.getElementById('site-youtube');
    const elOverlay = document.getElementById('toggle-overlay');
    const elTimeSelect = document.getElementById('time-limit-select');
    const elTimeCustom = document.getElementById('time-limit-custom');
    const elScrollDetect = document.getElementById('toggle-scroll-detect');
    const elFriction = document.getElementById('toggle-friction');
    const btnSave = document.getElementById('btn-save');
    const saveMsg = document.getElementById('save-msg');
  
    // Listen for custom time dropdown change to show/hide input
    elTimeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            elTimeCustom.classList.remove('hidden');
            elTimeCustom.focus();
        } else {
            elTimeCustom.classList.add('hidden');
        }
    });

    // Load existing configuration
    chrome.storage.sync.get([
      "monitoredSites", 
      "reminderTimeMins", 
      "scrollDetectionEnabled", 
      "overlayEnabled",
      "frictionEnabled"
    ], (res) => {
      if (res.monitoredSites) {
        elInsta.checked = !!res.monitoredSites.instagram;
        elYoutube.checked = !!res.monitoredSites.youtube;
      }
      elOverlay.checked = res.overlayEnabled !== false; // default true
      elScrollDetect.checked = res.scrollDetectionEnabled !== false;
      elFriction.checked = !!res.frictionEnabled;

      // Handle custom vs preset time loading
      const savedTime = res.reminderTimeMins || 7;
      let isPreset = false;
      Array.from(elTimeSelect.options).forEach(opt => {
          if (opt.value === String(savedTime)) isPreset = true;
      });

      if (isPreset) {
          elTimeSelect.value = savedTime;
      } else {
          elTimeSelect.value = 'custom';
          elTimeCustom.value = savedTime;
          elTimeCustom.classList.remove('hidden');
      }
    });
  
    btnSave.addEventListener('click', () => {
      // Determine time
      let finalTime = 7;
      if (elTimeSelect.value === 'custom') {
          finalTime = parseInt(elTimeCustom.value, 10);
          if (isNaN(finalTime) || finalTime < 1) finalTime = 1;
      } else {
          finalTime = parseInt(elTimeSelect.value, 10);
      }

      const config = {
        monitoredSites: {
          instagram: elInsta.checked,
          youtube: elYoutube.checked,
          twitter: false,
          reddit: false
        },
        reminderTimeMins: finalTime,
        scrollDetectionEnabled: elScrollDetect.checked,
        overlayEnabled: elOverlay.checked,
        frictionEnabled: elFriction.checked
      };
  
      chrome.storage.sync.set(config, () => {
        saveMsg.classList.add('visible');
        setTimeout(() => {
          saveMsg.classList.remove('visible');
        }, 3000);
      });

      // Update background timer manually if needed right away
      chrome.runtime.reload();
    });
  });

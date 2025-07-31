const TARGET_DOMAIN = "imeiapi.net";
let activeIMEITabId = null;

chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'checkIMEI') {
    const imei = message.imei;

    const tab = await chrome.tabs.create({
      url: `https://imeiapi.net/#${imei}`,
      active: true
    });

    activeIMEITabId = tab.id;

    await chrome.storage.local.set({
      imei,
      imeiTabId: tab.id
    });
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tabId !== activeIMEITabId) return;
  if (changeInfo.status !== 'complete') return;
  if (!tab.url.includes(TARGET_DOMAIN)) return;

  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const imei = location.hash.slice(1);

      async function delay(ms) {
        return new Promise(res => setTimeout(res, ms));
      }

      async function bruteForceClickCheckButton(timeoutLimit = 10000) {
        const startTime = Date.now();

        function getButton() {
          return document.querySelector('input.btn[type="submit"][value="check"]');
        }

        async function tryAllClicks(btn) {
          try {
            btn.click();
            await delay(200);
            if (!getButton()) return true;

            ['mousedown', 'mouseup', 'click'].forEach(type => {
              btn.dispatchEvent(new MouseEvent(type, { bubbles: true }));
            });
            await delay(200);
            if (!getButton()) return true;

            btn.focus();
            ['keydown', 'keypress', 'keyup'].forEach(eventType => {
              btn.dispatchEvent(new KeyboardEvent(eventType, {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
              }));
            });
            await delay(200);
            if (!getButton()) return true;

            const form = btn.closest('form');
            if (form) {
              form.requestSubmit?.() || form.submit();
              await delay(200);
              if (!getButton()) return true;
            }

            btn.focus();
            ['keydown', 'keypress', 'keyup'].forEach(eventType => {
              btn.dispatchEvent(new KeyboardEvent(eventType, {
                key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true
              }));
            });
            await delay(200);
            if (!getButton()) return true;
          } catch (e) {
            console.error('Click error:', e);
          }
          return false;
        }

        while (Date.now() - startTime < timeoutLimit) {
          const btn = getButton();
          if (!btn) return;
          const success = await tryAllClicks(btn);
          if (success) return;
          await delay(500);
        }
      }

      async function detectRecaptcha() {
        const iframe = document.querySelector('iframe[src*="recaptcha"]');
        const widget = document.querySelector('.g-recaptcha');
        const challenge = document.querySelector('[title="recaptcha challenge"]');
        const found = iframe || widget || challenge;
        await browser.storage.local.set({ recaptchaDetected: !!found });
        return !!found;
      }

      async function watchForDeviceInfo(maxTime = 10000) {
        const keywords = ["APPLE", "SAMSUNG", "GOOGLE", "GALAXY", "PIXEL", "ANDROID"];
        const start = Date.now();

        while (Date.now() - start < maxTime) {
          let deviceInfo = null, usbType = null, releaseYear = null;

          const h1s = Array.from(document.querySelectorAll('h1:not([class])'));
          for (const h1 of h1s) {
            if (keywords.some(k => h1.innerText.toUpperCase().includes(k))) {
              deviceInfo = h1.innerText.trim();
              break;
            }
          }

          const props = Array.from(document.querySelectorAll('td.phone-data-property-name'));

          const usbEl = props.find(td => td.textContent.trim() === 'USB Conector Type');
          if (usbEl?.nextElementSibling) {
            usbType = usbEl.nextElementSibling.textContent.trim();
          }

          const yearEl = props.find(td => td.textContent.trim() === 'Release Year');
          if (yearEl?.nextElementSibling) {
            releaseYear = yearEl.nextElementSibling.textContent.trim();
          }

          if (deviceInfo || usbType || releaseYear) {
            await browser.storage.local.set({
              ...(deviceInfo && { deviceInfo }),
              ...(usbType && { usbType }),
              ...(releaseYear && { releaseYear }),
              recaptchaDetected: false
            });
            return;
          }

          await delay(500);
        }

        await browser.storage.local.set({
          recaptchaDetected: false,
          deviceInfo: null,
          usbType: null,
          releaseYear: null,
          timedOut: true
        });
      }

      chrome.storage.onChanged.addListener(async (changes, area) => {
          if (area !== 'local') return;

          const keys = Object.keys(changes);
          const infoKeys = ['deviceInfo', 'usbType', 'releaseYear'];

          const anyInfoUpdated = infoKeys.some(key => changes[key]?.newValue);
          if (!anyInfoUpdated) return;

          const { imeiTabId } = await chrome.storage.local.get('imeiTabId');
          if (imeiTabId) {
            try {
              await chrome.tabs.remove(imeiTabId);
            } catch (err) {
              console.warn('Failed to close IMEI tab:', err);
            }
            await chrome.storage.local.remove('imeiTabId');
          }
        });

      (async () => {
        try {
          const recaptcha = await detectRecaptcha();

          const input = document.querySelector('input[type="text"]');
          if (input && input.value !== imei) {
            input.focus();
            input.value = imei;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }

          await bruteForceClickCheckButton();
          await watchForDeviceInfo(10000);
        } catch (err) {
          console.error("Automation error:", err);
        }
      })();
    }
  });
});

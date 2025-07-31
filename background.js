browser.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'checkIMEI') {
    const imei = message.imei;

    const tab = await browser.tabs.create({
      url: `https://imeiapi.net/#${imei}`,
      active: true
    });

    const listener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        let attemptCount = 0;
        const maxAttempts = 3;

        const injectScript = () => {
          browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const imei = location.hash.slice(1);

              function delay(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
              }

              function waitForElement(selector, timeout = 5000) {
                return new Promise((resolve, reject) => {
                  const interval = 100;
                  let elapsed = 0;
                  const check = () => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    elapsed += interval;
                    if (elapsed >= timeout) return reject(`Timeout: ${selector} not found`);
                    setTimeout(check, interval);
                  };
                  check();
                });
              }
              async function detectRecaptcha() {
              const iframe = document.querySelector('iframe[src*="recaptcha"]');
              const widget = document.querySelector('.g-recaptcha');
              const challenge = document.querySelector('[title="recaptcha challenge"]');

              if (iframe || widget || challenge) {
                await browser.storage.local.set({ recaptchaDetected: true });
                console.warn("reCAPTCHA detected — halting automation.");
                return true;
              }

              await browser.storage.local.set({ recaptchaDetected: false });
              return false;
            }

              async function bruteForceClickCheckButton() {
                const timeout = 3000;
                const interval = 500;
                const start = Date.now();

                function getButton() {
                  return document.querySelector('input.btn[type="submit"][value="check"]');
                }

                async function tryAllClicks(btn) {
                  try {
                    // Method 1: .click()
                    btn.click();
                    await delay(200);
                    if (!getButton()) return true;

                    // Method 2: Mouse events
                    ['mousedown', 'mouseup', 'click'].forEach(type => {
                      btn.dispatchEvent(new MouseEvent(type, { bubbles: true }));
                    });
                    await delay(200);
                    if (!getButton()) return true;

                    // Method 3: Enter key
                    btn.focus();
                    ['keydown', 'keypress', 'keyup'].forEach(eventType => {
                      btn.dispatchEvent(new KeyboardEvent(eventType, {
                        key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
                      }));
                    });
                    await delay(200);
                    if (!getButton()) return true;

                    // Method 4: Form submit
                    const form = btn.closest('form');
                    if (form) {
                      form.requestSubmit?.() || form.submit();
                      await delay(200);
                      if (!getButton()) return true;
                    }

                    // Method 5: Space key
                    btn.focus();
                    ['keydown', 'keypress', 'keyup'].forEach(eventType => {
                      btn.dispatchEvent(new KeyboardEvent(eventType, {
                        key: ' ', code: 'Space', keyCode: 32, which: 32, bubbles: true
                      }));
                    });
                    await delay(200);
                    if (!getButton()) return true;

                  } catch (e) {
                    console.error('Error trying to click check button:', e);
                  }
                  return false;
                }

                while (Date.now() - start < timeout) {
                  const btn = getButton();
                  if (!btn) return; // Success
                  const clicked = await tryAllClicks(btn);
                  if (clicked) return;
                  await delay(interval);
                }

                console.warn("Check button still present after 10 seconds.");
              }

              async function detectDeviceInfo() {
                const keywords = ["APPLE", "SAMSUNG", "GOOGLE", "GALAXY", "PIXEL", "ANDROID"];
                let deviceInfo = null;
                let usbType = null;
                let releaseYear = null;

                for (let i = 0; i < 20; i++) {
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

                  if (deviceInfo || usbType || releaseYear) break;
                  await delay(500);
                }

                await browser.storage.local.set({
                  ...(deviceInfo && { deviceInfo }),
                  ...(usbType && { usbType }),
                  ...(releaseYear && { releaseYear })
                });
              }

              (async () => {
                try {
                  const input = await waitForElement('input[type="text"]');
                  input.focus();
                  await delay(100);
                  input.value = imei;
                  input.dispatchEvent(new Event('input', { bubbles: true }));

                  // Optional: simulate Tab + Enter for form submission fallback
                  ['keydown', 'keyup'].forEach(eventType => {
                    const tabEvent = new KeyboardEvent(eventType, {
                      key: 'Tab',
                      code: 'Tab',
                      keyCode: 9,
                      which: 9,
                      bubbles: true,
                      cancelable: true
                    });
                    document.activeElement.dispatchEvent(tabEvent);
                  });

                  await delay(200);
                  ['keydown', 'keypress', 'keyup'].forEach(eventType => {
                    const enterEvent = new KeyboardEvent(eventType, {
                      key: 'Enter',
                      code: 'Enter',
                      keyCode: 13,
                      which: 13,
                      bubbles: true,
                      cancelable: true
                    });
                    document.activeElement.dispatchEvent(enterEvent);
                  });

                  await bruteForceClickCheckButton();
                  await detectDeviceInfo();

                } catch (err) {
                  console.error("IMEI Injection Error:", err);
                  throw err;
                }
              })();
            }
          }).catch(err => {
            attemptCount++;
            if (attemptCount < maxAttempts) {
              setTimeout(injectScript, 1000);
            } else {
              console.error("Script injection failed after 3 attempts.");
            }
          });
        };

        injectScript();
        browser.tabs.onUpdated.removeListener(listener);
      }
    };

    browser.tabs.onUpdated.addListener(listener);
  }
});

function simulateHumanMouse() {
  const evt = new MouseEvent('mousemove', {
    bubbles: true,
    clientX: Math.floor(Math.random() * window.innerWidth),
    clientY: Math.floor(Math.random() * window.innerHeight)
  });
  document.dispatchEvent(evt);
}


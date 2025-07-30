chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'checkIMEI') {
    const imei = message.imei;

    const tab = await chrome.tabs.create({
      url: "https://www.imei.info/",
      active: false
    });

    const listener = (tabId, changeInfo, tabInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async (imei) => {
            function waitForElement(selector, timeout = 10000) {
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

            try {
              const input = await waitForElement('input[id="//:Ran8qejtcva//:"]');
              const button = await waitForElement('button[type="submit"]');
              input.value = imei;
              input.dispatchEvent(new Event('input', { bubbles: true })); // simulate real typing
              button.click();
            } catch (err) {
              console.error("Error injecting IMEI:", err);
            }
          },
          args: [imei]
        }).catch(err => {
          console.error("Injection failed:", err);
        });

        chrome.tabs.onUpdated.removeListener(listener);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  }
});

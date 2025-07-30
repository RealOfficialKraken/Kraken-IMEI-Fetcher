chrome.runtime.onMessage.addListener(async (message, sender) => {
  if (message.action === 'checkIMEI') {
    const imei = message.imei;

    // 1. Open the tab (but do NOT inject yet)
    const tab = await chrome.tabs.create({
      url: "https://imeicheck.com/imei-check/",
      active: false
    });

    // 2. Wait for the tab to finish loading
    const listener = (tabId, changeInfo, tabInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (imei) => {
            const input = document.querySelector('input[name="imei"]');
            const button = document.querySelector('button[type="submit"]');
            if (input && button) {
              input.value = imei;
              button.click();
            } else {
              console.log('IMEI input or submit button not found');
            }
          },
          args: [imei]
        }).catch(err => {
          console.error("Injection failed:", err);
        });

        chrome.tabs.onUpdated.removeListener(listener); // clean up
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  chrome.storage.local.get(['imeiTabId'], async ({ imeiTabId }) => {
    if (tabId !== imeiTabId) return;

    console.log('[KIL] Cloudflare Detected. Executing script to read page content...');

    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          return document.body.innerText; // JSON as plain text
        } catch (e) {
          return null;
        }
      }
    }, async (results) => {
      const rawText = results?.[0]?.result;

      if (!rawText) {
        console.error('[KIL] Could not read page content.');
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (err) {
        console.error('[KIL] Failed to parse JSON:', err, 'Raw text:', rawText);
        return;
      }

      if (!parsed.object || !parsed.result) {
        console.warn('[KIL] JSON missing expected fields:', parsed);
        return;
      }

      await chrome.storage.local.set({
        resultText: parsed.result,
        object: parsed.object,
        recaptchaDetected: false,
        imeiTabId: null
      });

      chrome.runtime.sendMessage({ action: 'updateIMEI' });

      console.log('[KIL] Data saved. Closing tab.');
      chrome.tabs.remove(tabId);
    });
  });
});

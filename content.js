(async () => {
  const delay = ms => new Promise(res => setTimeout(res, ms));
  const keywords = ["APPLE", "SAMSUNG", "GOOGLE", "GALAXY", "PIXEL", "ANDROID"];

  async function watchForDeviceInfo(maxTime = 15000) {
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
          recaptchaDetected: false // clear recaptcha warning if info appears
        });
        break;
      }

      await delay(500);
    }
  }

  // Watch on page load or after manual interaction
  watchForDeviceInfo();
})();

document.addEventListener('DOMContentLoaded', async () => {
  const imeiInput = document.getElementById('imeiInput');
  const checkButton = document.getElementById('checkButton');
  const resultDisplay = document.getElementById('result');
  const copyButton = document.getElementById('copyButton');
  const copyImeiButton = document.getElementById('copyImeiButton');
  const clearButton = document.getElementById('clearButton');

  // Load IMEI immediately
  const { imei } = await browser.storage.local.get('imei');
  if (imei) imeiInput.value = imei;

  // Unified info display
  async function displayInfo() {
  const {
    imei,
    deviceInfo,
    usbType,
    releaseYear,
    recaptchaDetected,
    imeiTabId
  } = await browser.storage.local.get([
    'imei', 'deviceInfo', 'usbType', 'releaseYear', 'recaptchaDetected', 'imeiTabId'
  ]);

  const hasInfo = !!deviceInfo;

  if (hasInfo) {
    let html = `<h3>${deviceInfo}</h3>`;
    if (imei) html += `<p><strong>IMEI:</strong> ${imei}</p>`;
    if (usbType) html += `<p><strong>USB:</strong> ${usbType}</p>`;
    if (releaseYear) html += `<p><strong>Year:</strong> ${releaseYear}</p>`;
    resultDisplay.innerHTML = html;

    // Show action buttons
    copyButton.classList.remove('hidden');
    copyImeiButton.classList.remove('hidden');
    clearButton.classList.remove('hidden');

    // Close tab if still open
    if (imeiTabId) {
      try {
        await browser.tabs.remove(imeiTabId);
      } catch (err) {}
      await browser.storage.local.remove('imeiTabId');
    }
  } else if (recaptchaDetected) {
    resultDisplay.innerHTML = `<p style="color:red;">Loading... Do not close out of this window.</p>`;
    // Hide buttons since info is not available
    copyButton.classList.add('hidden');
    copyImeiButton.classList.add('hidden');
    clearButton.classList.add('hidden');
  } else {
    resultDisplay.innerHTML = `<p></p>`;
    copyButton.classList.add('hidden');
    copyImeiButton.classList.add('hidden');
    clearButton.classList.add('hidden');
  }
}



  await displayInfo(); // initial render

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (
      changes.deviceInfo || changes.usbType || changes.releaseYear || changes.recaptchaDetected
    )) {
      displayInfo();
    }
  });

  checkButton.addEventListener('click', async () => {
  const inputImei = imeiInput.value.trim();
  if (!/^\d{15}$/.test(inputImei)) {
    alert("Please enter a valid 15-digit IMEI number.");
    return;
  }

  // Clear previous result-related data
  await browser.storage.local.remove([
    'deviceInfo',
    'usbType',
    'releaseYear',
    'recaptchaDetected'
  ]);

  // Update UI immediately
  resultDisplay.innerHTML = `<p>Loading... Do not close out of this window.</p>`;

  // Save IMEI and trigger background process
  await browser.storage.local.set({ imei: inputImei });
  browser.runtime.sendMessage({ action: 'checkIMEI', imei: inputImei });
});


  copyButton.addEventListener('click', async () => {
    const { deviceInfo } = await browser.storage.local.get('deviceInfo');
    if (deviceInfo) {
      const match = deviceInfo.match(/\(([^)]+)\)/);
      const toCopy = match ? match[1] : deviceInfo;
      await navigator.clipboard.writeText(toCopy);
    }
  });

  copyImeiButton.addEventListener('click', async () => {
    const { imei } = await browser.storage.local.get('imei');
    if (imei) {
      await navigator.clipboard.writeText(imei);
    }
  });

  clearButton.addEventListener('click', async () => {
    await browser.storage.local.clear();
    resultDisplay.innerHTML = '';
    imeiInput.value = '';
  });
});

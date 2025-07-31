document.addEventListener('DOMContentLoaded', async () => {
  const input = document.getElementById('imeiInput');
  const resultDisplay = document.getElementById('result');
  const copyBtn = document.getElementById('copyButton');
  const copyImeiBtn = document.getElementById('copyImeiButton');
  const clearBtn = document.getElementById('clearButton');

  const { imei, deviceInfo, usbType, releaseYear } = await browser.storage.local.get([
    'imei', 'deviceInfo', 'usbType', 'releaseYear'
  ]);

  if (imei) input.value = imei;

  let html = '';
  if (deviceInfo) {
    html += `<h3 id="deviceText">${deviceInfo}</h3>`;
    if (imei) html += `<p><strong>IMEI:</strong> ${imei}</p>`;
  }
  if (usbType) html += `<p><strong>USB:</strong> ${usbType}</p>`;
  if (releaseYear) html += `<p><strong>Release Year:</strong> ${releaseYear}</p>`;

  if (html) {
    resultDisplay.innerHTML = html;
    copyBtn.style.display = 'block';
  }

  copyBtn.addEventListener('click', async () => {
    let textToCopy = '';
    if (deviceInfo) {
      const match = deviceInfo.match(/\(([^)]+)\)/);
      textToCopy = match ? match[1] : deviceInfo;
    }
    await navigator.clipboard.writeText(textToCopy);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => (copyBtn.textContent = 'Copy Info'), 1000);
  });

  copyImeiBtn.addEventListener('click', async () => {
    if (imei) {
      await navigator.clipboard.writeText(imei);
      copyImeiBtn.textContent = 'IMEI Copied!';
      setTimeout(() => (copyImeiBtn.textContent = 'Copy IMEI'), 1000);
    }
  });

  clearBtn.addEventListener('click', async () => {
    await browser.storage.local.remove(['imei', 'deviceInfo', 'usbType', 'releaseYear']);
    input.value = '';
    resultDisplay.innerHTML = '';
    copyBtn.style.display = 'none';
    copyBtn.textContent = 'Copy Info';
    copyImeiBtn.textContent = 'Copy IMEI';
  });
});



document.getElementById('checkButton').addEventListener('click', async () => {
  const imei = document.getElementById('imeiInput').value.trim();

  if (!/^\d{15}$/.test(imei)) {
    alert("Please enter a valid 15-digit IMEI number.");
    return;
  }

  await browser.storage.local.set({ imei });
  browser.runtime.sendMessage({ action: 'checkIMEI', imei });
});

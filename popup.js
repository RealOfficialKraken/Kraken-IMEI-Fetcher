document.addEventListener('DOMContentLoaded', async () => {
  const imeiInput = document.getElementById('imeiInput');
  const checkButton = document.getElementById('checkButton');
  const resultDisplay = document.getElementById('result');
  const copyImeiButton = document.getElementById('copyImeiButton');
  const clearButton = document.getElementById('clearButton');

  const displayInfo = async () => {
    const {
      imei,
      resultText,
      object,
      recaptchaDetected,
      imeiTabId
    } = await chrome.storage.local.get([
      'imei', 'resultText', 'object', 'recaptchaDetected', 'imeiTabId'
    ]);

    if (resultText && object) {
      let html = `<h3>${resultText}</h3>`;
      if (imei) html += `<p><strong>IMEI:</strong> ${imei}</p>`;

      for (const key in object) {
        if (!object[key]) continue;
        const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
        html += `<p><strong>${label}:</strong> ${object[key]}</p>`;
      }

      resultDisplay.innerHTML = html;
      copyImeiButton.classList.remove('hidden');
      clearButton.classList.remove('hidden');

      if (imeiTabId) {
        try {
          await chrome.tabs.remove(imeiTabId);
        } catch (err) {}
        await chrome.storage.local.remove('imeiTabId');
      }
    } else if (recaptchaDetected) {
      resultDisplay.innerHTML = `<p style="color:red;">Loading... Do not close out of this window.</p>`;
      copyImeiButton.classList.add('hidden');
      clearButton.classList.add('hidden');
    } else {
      resultDisplay.innerHTML = `<p></p>`;
      copyImeiButton.classList.add('hidden');
      clearButton.classList.add('hidden');
    }
  };

  // Initial display
  await displayInfo();

  const { imei } = await chrome.storage.local.get('imei');
  if (imei) imeiInput.value = imei;

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.resultText || changes.object || changes.recaptchaDetected)) {
      displayInfo();
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'updateIMEI') {
      displayInfo();
    }
  });

  checkButton.addEventListener('click', async () => {
    const inputImei = imeiInput.value.trim();
    if (!/^\d{15}$/.test(inputImei)) {
      alert("Please enter a valid 15-digit IMEI number.");
      return;
    }

    resultDisplay.innerHTML = `<p>Checking IMEI...</p>`;
    await chrome.storage.local.set({ imei: inputImei });

    const url = `https://alpha.imeicheck.com/api/modelBrandName?imei=${inputImei}&format=json`;

    let attempt = 0;
    let success = false;

    while (attempt < 2 && !success) {
      attempt++;

      try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type');

        if (!contentType || contentType.includes('text/html')) {
          console.log('Cloudflare protection triggered. Opening manual solve tab.');
          resultDisplay.innerHTML = `
            <p style="color:red;">Cloudflare protection detected. Please solve the challenge in the new tab.</p>
          `;

          const tab = await chrome.tabs.create({ url, active: false });
          await chrome.storage.local.set({
            recaptchaDetected: true,
            imeiTabId: tab.id
          });
          return;
        }

        const data = await response.json();
        const { result, object } = data;

        if (!result || !object) {
          console.warn(`Attempt ${attempt}: No results found for this IMEI.`);
          continue;
        }

        await chrome.storage.local.set({
          resultText: result,
          object
        });

        success = true;
        await displayInfo();
      } catch (err) {
        console.error(`Attempt ${attempt}: IMEI API Error:`, err);
      }
    }

    if (!success) {
      resultDisplay.innerHTML = `<p style="color:red;">Failed to retrieve IMEI data after 2 attempts.</p>`;
    }
  });

  copyImeiButton.addEventListener('click', async () => {
    const { imei } = await chrome.storage.local.get('imei');
    if (imei) {
      await navigator.clipboard.writeText(imei);
    }
  });


  clearButton.addEventListener('click', async () => {
    await chrome.storage.local.clear();
    resultDisplay.innerHTML = '';
    imeiInput.value = '';
    copyImeiButton.classList.add('hidden');
    clearButton.classList.add('hidden');
  });

  await chrome.storage.local.remove(['recaptchaDetected']);
});

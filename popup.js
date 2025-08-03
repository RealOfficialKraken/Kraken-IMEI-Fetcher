let isCooldownActive = false;

document.addEventListener('DOMContentLoaded', async () => {
  const imeiInput = document.getElementById('imeiInput');
  const checkButton = document.getElementById('checkButton');
  const resultDisplay = document.getElementById('result');
  const copyImeiButton = document.getElementById('copyImeiButton');
  const clearButton = document.getElementById('clearButton');

  document.getElementById('info-button').addEventListener('click', () => {
    const popover = document.getElementById('info-popover');
    const isVisible = popover.style.visibility === 'visible';
    popover.style.visibility = isVisible ? 'hidden' : 'visible';
    popover.style.opacity = isVisible ? '0' : '1';
  });

  const displayInfo = async () => {
    const {
      imei,
      object,
      recaptchaDetected,
      imeiTabId
    } = await chrome.storage.local.get(['imei', 'object', 'recaptchaDetected', 'imeiTabId']);

    if (object) {
      let html = '';
      if (imei) html += `<p><strong>IMEI:</strong> ${imei}</p>`;
      if (object.brand) html += `<p><strong>Brand:</strong> ${object.brand}</p>`;
      if (object.model) html += `<p><strong>Model:</strong> ${object.model}</p>`;

      if (object.name) {
        html += `<p><strong>Name:</strong> ${object.name}</p>`;
      } else if (object.modelName) {
        html += `<p><strong>Name:</strong> ${object.modelName}</p>`;
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
      resultDisplay.innerHTML = `<p style="color:red;">Fetching IMEI...</p>`;
      copyImeiButton.classList.add('hidden');
      clearButton.classList.add('hidden');
    } else {
      const { resultText } = await chrome.storage.local.get('resultText');
      if (resultText) {
        resultDisplay.innerHTML = `<p style="color:red;">${resultText}</p>`;
      } else {
        resultDisplay.innerHTML = `<p></p>`;
      }
      copyImeiButton.classList.add('hidden');
      clearButton.classList.add('hidden');
    }
  };

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
  if (isCooldownActive) {
    alert("You're sending requests too quickly. Please wait 3 seconds before trying again.");
    return;
  }

  const inputImei = imeiInput.value.trim();
  if (!/^\d{15}$/.test(inputImei)) {
    alert("Please enter a valid 15-digit IMEI number.");
    return;
  }

  resultDisplay.innerHTML = `<p>Checking IMEI...</p>`;
  checkButton.disabled = true;
  checkButton.classList.add('opacity-50', 'cursor-not-allowed');

  await chrome.storage.local.remove(['object', 'resultText', 'recaptchaDetected']);
  await chrome.storage.local.set({ imei: inputImei });

  const api_key = getApiKey()

  function getApiKey() {
    const encoded = "M0FENS1GMkIwLTZDOTgtMzRBMS01NEVDLTgxVkM=";
    return atob(encoded);
  }

  const url = `https://alpha.imeicheck.com/api/free_with_key/modelBrandName?key=${api_key}&imei=${inputImei}&format=json`;

  let attempt = 0;
  let successfulFetch = false;
  let data = null;

  while (attempt < 2 && !successfulFetch) {
    attempt++;

    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');

      if (!contentType || contentType.includes('text/html')) {
      console.log('Cloudflare protection triggered. Opening manual solve tab.');
      resultDisplay.innerHTML = `<p style="color:red;">Cloudflare protection detected. Please wait.</p>`;
      const tab = await chrome.tabs.create({ url, active: false });
      await chrome.storage.local.set({
        recaptchaDetected: true,
        imeiTabId: tab.id
      });

      isCooldownActive = true;
      let cooldownTime = 3;
      checkButton.textContent = `Check IMEI (${cooldownTime}s)`;

      const countdownInterval = setInterval(() => {
        cooldownTime--;
        if (cooldownTime > 0) {
          checkButton.textContent = `Check IMEI (${cooldownTime}s)`;
        } else {
          clearInterval(countdownInterval);
          isCooldownActive = false;
          checkButton.disabled = false;
          checkButton.textContent = 'Check IMEI';
          checkButton.classList.remove('opacity-50', 'cursor-not-allowed');
        }
      }, 1000);

      return;
    }

      data = await response.json();

      if (data.status === "rejected" && data.result === "INVALID IMEI") {
        await chrome.storage.local.set({
          resultText: "Invalid IMEI provided.",
          object: null
        });
        await displayInfo();
        checkButton.disabled = false;
        checkButton.classList.remove('opacity-50', 'cursor-not-allowed');
        return;
      }

      if (data.result && data.object) {
        successfulFetch = true;
      }

    } catch (err) {
      console.error(`Attempt ${attempt}: IMEI API Error:`, err);
    }
  }

  if (!successfulFetch) {
    resultDisplay.innerHTML = `<p style="color:red;">Failed to retrieve IMEI data after 2 attempts.</p>`;
    checkButton.disabled = false;
    checkButton.classList.remove('opacity-50', 'cursor-not-allowed');
    return;
  }

  await chrome.storage.local.set({
    resultText: data.result,
    object: data.object
  });
  await displayInfo();

  isCooldownActive = true;
  let cooldownTime = 3;
  checkButton.textContent = `Check IMEI (${cooldownTime}s)`;

  const countdownInterval = setInterval(() => {
    cooldownTime--;
    if (cooldownTime > 0) {
      checkButton.textContent = `Check IMEI (${cooldownTime}s)`;
    } else {
      clearInterval(countdownInterval);
      isCooldownActive = false;
      checkButton.disabled = false;
      checkButton.textContent = 'Check IMEI';
      checkButton.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }, 1000);
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

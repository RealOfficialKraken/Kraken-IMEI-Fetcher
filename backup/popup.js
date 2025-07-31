document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('imeiInput');
  const button = document.getElementById('checkButton');
  const copyContainer = document.getElementById('copyContainer');
  const copyText = document.getElementById('copyText');
  const resultDiv = document.getElementById('result');

  // Load saved IMEI
  const savedImei = localStorage.getItem('savedIMEI');
  if (savedImei) {
    input.value = savedImei;
    copyText.textContent = savedImei;
    copyContainer.style.display = 'block';
  }

  button.addEventListener('click', async () => {
    const imei = input.value.trim();

    if (!/^\d{15}$/.test(imei)) {
      alert("Please enter a valid 15-digit IMEI number.");
      return;
    }

    localStorage.setItem('savedIMEI', imei);
    copyText.textContent = imei;
    copyContainer.style.display = 'block';

    resultDiv.textContent = 'Checking...';

    chrome.runtime.sendMessage({ action: 'checkIMEI', imei }, (response) => {
      if (response.success) {
        resultDiv.textContent = `Model: ${response.model}`;
      } else {
        resultDiv.textContent = `Error: ${response.error}`;
      }
    });
  });

  copyContainer.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyText.textContent);
      copyContainer.textContent = 'IMEI Copied!';
      setTimeout(() => {
        copyContainer.innerHTML = 'Click to Copy IMEI <span id="copyText" style="display:none;">' + copyText.textContent + '</span>';
      }, 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });
});

document.getElementById('checkButton').addEventListener('click', async () => {
    const imei = document.getElementById('imeiInput').value.trim();

    if (!/^\d{15}$/.test(imei)) {
        alert("Please enter a valid 15-digit IMEI number.");
        return;
    }

    chrome.runtime.sendMessage({ action: 'checkIMEI', imei });
});
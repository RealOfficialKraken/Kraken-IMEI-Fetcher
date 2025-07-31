browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'checkIMEI') {
    const imei = message.imei;

    // Replace these with your actual values
    const apikey = 'qgWshVBuMryaGSdQvsL5Q0Vxd6CFP2lmGFB5cK5zJw3yY9D22Yyc6FukXQft';
    const service_id = 'FREE_TAC_SERVICE_ID'; // You'll get this from the service list

    const url = `https://api-client.imei.org/api/submit?apikey=${apikey}&service_id=${service_id}&input=${imei}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 1 && data.response?.services?.length > 0) {
        const { Model } = data.response.services[0];
        sendResponse({ success: true, model: Model });
      } else {
        sendResponse({ success: false, error: 'No device info found.' });
      }
    } catch (error) {
      console.error("API error:", error);
      sendResponse({ success: false, error: 'Request failed.' });
    }

    return true; // Keep the message channel open for sendResponse
  }
});
// ============ SMM Provider API (Ezkify) ============
const PROVIDER_API_URL = process.env.SMM_PROVIDER_URL;
const PROVIDER_API_KEY = process.env.SMM_PROVIDER_KEY;

// ============ PLACE ORDER ============
async function placeOrder(providerServiceId, link, quantity) {
  try {
    if (!PROVIDER_API_KEY) throw new Error('SMM_PROVIDER_KEY not set');
    if (!providerServiceId) throw new Error('Provider service ID not mapped');
    if (!PROVIDER_API_URL) throw new Error('SMM_PROVIDER_URL not set');

    const params = new URLSearchParams({
      key: PROVIDER_API_KEY,
      action: 'add',
      service: providerServiceId,
      link: link,
      quantity: quantity.toString(),
    });

    console.log(`📤 Sending to provider: service=${providerServiceId}, qty=${quantity}`);

    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = await response.json();
    console.log('📥 Provider response:', data);
    return data;
  } catch (e) {
    console.error('❌ Provider placeOrder error:', e.message);
    return { error: e.message };
  }
}

// ============ CHECK STATUS ============
async function checkStatus(providerOrderId) {
  try {
    const params = new URLSearchParams({
      key: PROVIDER_API_KEY,
      action: 'status',
      order: providerOrderId,
    });
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ============ CHECK BALANCE ============
async function checkBalance() {
  try {
    const params = new URLSearchParams({
      key: PROVIDER_API_KEY,
      action: 'balance',
    });
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { placeOrder, checkStatus, checkBalance };

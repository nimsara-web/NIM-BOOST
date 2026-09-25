// ============ SMM Provider API (SMM Africa v3) ============
const PROVIDER_API_URL = process.env.SMM_PROVIDER_URL || 'https://smm.africa/api/v3';
const PROVIDER_API_KEY = process.env.SMM_PROVIDER_KEY;

// ============ HELPER: Generate Idempotency Key ============
function generateIdempotencyKey() {
  return `nimora-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ============ PLACE ORDER ============
async function placeOrder(providerServiceId, link, quantity, idempotencyKey = null) {
  try {
    if (!PROVIDER_API_KEY) throw new Error('SMM_PROVIDER_KEY not set');
    if (!providerServiceId) throw new Error('Provider service ID not mapped');
    if (!PROVIDER_API_URL) throw new Error('SMM_PROVIDER_URL not set');

    const key = idempotencyKey || generateIdempotencyKey();

    const body = {
      action: 'add',
      service: parseInt(providerServiceId),  // ⚠️ Integer වෙන්න ඕන
      link: link,
      quantity: parseInt(quantity),
      idempotency_key: key,
    };

    console.log(`📤 Sending to SMM Africa: service=${providerServiceId}, qty=${quantity}, key=${key}`);

    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('📥 SMM Africa response:', data);

    // Error handling
    if (data.error) {
      return { error: data.error, httpStatus: response.status };
    }

    return data;
  } catch (e) {
    console.error('❌ placeOrder error:', e.message);
    return { error: e.message };
  }
}

// ============ CHECK ORDER STATUS ============
async function checkStatus(providerOrderId) {
  try {
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        action: 'status',
        order: providerOrderId,
      }),
    });

    const data = await response.json();
    return data;
  } catch (e) {
    return { error: e.message };
  }
}

// ============ CHECK BALANCE ============
async function checkBalance() {
  try {
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        action: 'balance',
      }),
    });

    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ============ FETCH SERVICES CATALOG ============
async function fetchServices() {
  try {
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        action: 'services',
      }),
    });

    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ============ REQUEST REFILL ============
async function requestRefill(providerOrderId) {
  try {
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        action: 'refill',
        order: providerOrderId,
      }),
    });

    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

// ============ REQUEST CANCEL ============
async function requestCancel(providerOrderId) {
  try {
    const response = await fetch(PROVIDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PROVIDER_API_KEY}`,
      },
      body: JSON.stringify({
        action: 'cancel',
        order: providerOrderId,
      }),
    });

    return await response.json();
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = {
  placeOrder,
  checkStatus,
  checkBalance,
  fetchServices,
  requestRefill,
  requestCancel,
  generateIdempotencyKey,
};

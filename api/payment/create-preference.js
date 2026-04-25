
export default async function handler(req, res) {
  // Configura CORS para permitir chamadas do seu próprio domínio
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, userEmail, planoId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  try {
    // Criação de ASSINATURA (Preapproval)
    const subscriptionData = {
      reason: `LupaAI - Assinatura Mensal PRO`,
      external_reference: userId,
      payer_email: userEmail || "teste@exemplo.com",
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 49.90,
        currency_id: "BRL"
      },
      back_url: `https://${req.headers.host}/dashboard`,
      status: "pending"
    };

    const response = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(subscriptionData)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro MP (Assinatura):", data);
      return res.status(500).json({ error: 'Mercado Pago error', details: data });
    }

    // O link de pagamento da assinatura fica em 'init_point'
    return res.status(200).json({ checkoutUrl: data.init_point });
  } catch (error) {
    console.error("Erro interno:", error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

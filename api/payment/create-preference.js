
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

  const { userId, planoId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  try {
    const preference = {
      items: [
        {
          title: `LupaAI - Plano ${planoId === 'pro' ? 'PRO' : 'Premium'}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: 49.90
        }
      ],
      external_reference: userId,
      // URL de Webhook dinâmica (usa a URL da própria Vercel)
      notification_url: `https://${req.headers.host}/api/payment/webhook`,
      back_urls: {
        success: `https://${req.headers.host}/dashboard`,
        failure: `https://${req.headers.host}/dashboard`,
        pending: `https://${req.headers.host}/dashboard`
      },
      auto_return: "approved"
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Erro MP:", data);
      return res.status(500).json({ error: 'Mercado Pago error', details: data });
    }

    return res.status(200).json({ checkoutUrl: data.init_point });
  } catch (error) {
    console.error("Erro interno:", error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}

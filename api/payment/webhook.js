
import * as admin from 'firebase-admin';

// Inicializa o Firebase Admin usando a variável de ambiente
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Erro ao inicializar Firebase Admin:", error);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

  try {
    const payload = req.body;
    let statusPagamento = "";
    let userId = "";
    let valorTransacao = 0;
    let transactionId = "";

    // Lógica para capturar o ID do pagamento
    const paymentId = payload.data?.id || req.query.id || req.body.id;
    
    if (!paymentId || isNaN(paymentId)) {
      return res.status(200).send("Sem ID de pagamento válido");
    }

    // Consulta a API do Mercado Pago para detalhes
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
    });

    if (!mpResponse.ok) {
      return res.status(200).send("Erro ao consultar MP, mas OK");
    }

    const paymentData = await mpResponse.json();

    statusPagamento = paymentData.status;
    userId = paymentData.external_reference; // O ID do usuário que passamos no link
    valorTransacao = paymentData.transaction_amount;
    transactionId = paymentId.toString();

    // Se aprovado, ativa o PRO no Firestore
    if (statusPagamento === "approved" && userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        await userRef.update({
          isPro: true,
          subscriptionStatus: "active",
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Salva log de pagamento
        await userRef.collection("payments").doc(transactionId).set({
          transactionId,
          amount: valorTransacao,
          status: statusPagamento,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          gateway: "Mercado Pago"
        });

        console.log(`Sucesso: Assinatura ativada para o usuário ${userId}`);
      }
    }

    return res.status(200).send("Webhook processado");

  } catch (error) {
    console.error("Erro no Webhook:", error);
    return res.status(200).send("Erro interno, mas recebido");
  }
}

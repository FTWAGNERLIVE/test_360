
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
    
    // Captura o ID e o Tipo (Assinatura ou Pagamento Avulso)
    const resourceId = payload.data?.id || req.query.id || req.body.id;
    const topic = payload.type || payload.topic || "payment";

    if (!resourceId) return res.status(200).send("Sem ID");

    // SE FOR ASSINATURA (PREAPPROVAL)
    if (topic === "subscription_preapproval" || topic === "preapproval") {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${resourceId}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const data = await response.json();
      
      statusPagamento = data.status; // 'authorized' quando ativa
      userId = data.external_reference;

      if (statusPagamento === "authorized" && userId) {
        await activateProUser(userId, resourceId, "Subscription");
      }
    } 
    // SE FOR PAGAMENTO AVULSO OU MENSALIDADE
    else if (topic === "payment") {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${resourceId}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const data = await response.json();
      
      statusPagamento = data.status; // 'approved'
      userId = data.external_reference;

      if (statusPagamento === "approved" && userId) {
        await activateProUser(userId, resourceId, "Monthly Payment");
      }
    }

    return res.status(200).send("OK");
  } catch (error) {
    console.error("Erro no Webhook:", error);
    return res.status(200).send("Error handled");
  }
}

// Função auxiliar para ativar o usuário no Firestore
async function activateProUser(userId, transactionId, type) {
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    await userRef.update({
      isPro: true,
      subscriptionStatus: "active",
      subscriptionType: "recurring",
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
    });

    await userRef.collection("payments").doc(transactionId).set({
      transactionId,
      status: "approved",
      type: type,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      gateway: "Mercado Pago"
    });
  }
}
}

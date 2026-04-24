import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa o Admin SDK para acessar o Firestore com privilégios totais
admin.initializeApp();
const db = admin.firestore();

const MP_ACCESS_TOKEN = "APP_USR-6855382522338667-042321-73722d34984e886a3f854545ec977eb5-378580699";

/**
 * 1. CLOUD FUNCTION PARA CRIAR O LINK DINÂMICO
 * Chamada pelo frontend quando o usuário clica em "Assinar"
 */
export const createMercadoPagoLink = functions.https.onCall(async (data, context) => {
  // Verifica se o usuário está logado
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "O usuário deve estar logado.");
  }

  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;

  try {
    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: [
          {
            title: "Assinatura LupaAI PRO",
            description: "Acesso total aos recursos premium",
            quantity: 1,
            currency_id: "BRL",
            unit_price: 97.00 // Pode ser alterado dinamicamente
          }
        ],
        payer: {
          email: userEmail
        },
        // VITAL: Passa o userId pro webhook saber quem pagou!
        external_reference: userId, 
        back_urls: {
          success: "https://seusite.com/dashboard",
          pending: "https://seusite.com/dashboard",
          failure: "https://seusite.com/dashboard"
        },
        auto_return: "approved"
      })
    });

    const mpData = await response.json();

    if (!response.ok) {
      console.error("Erro no Mercado Pago:", mpData);
      throw new functions.https.HttpsError("internal", "Erro ao gerar link de pagamento no MP");
    }

    // Retorna a URL de checkout (init_point) pro Frontend redirecionar
    return { checkoutUrl: mpData.init_point };

  } catch (error) {
    console.error("Erro interno:", error);
    throw new functions.https.HttpsError("internal", "Falha ao processar requisição");
  }
});


/**
 * 2. WEBHOOK PARA RECEBER CONFIRMAÇÃO DE PAGAMENTO
 */
export const webhookPagamento = functions.https.onRequest(async (req, res) => {
  try {
    const payload = req.body;
    let statusPagamento = "";
    let userId = "";
    let valorTransacao = 0;
    let transactionId = "";

    // VERIFICA SE É DO MERCADO PAGO
    if (payload.action === "payment.created" || payload.action === "payment.updated" || payload.type === "payment") {
      // O MP manda apenas o ID do pagamento no webhook. Precisamos buscar os detalhes.
      const paymentId = payload.data?.id || req.query.id || req.body.id;
      
      if (!paymentId) {
        res.status(200).send("Sem ID de pagamento");
        return;
      }

      // Consulta a API do Mercado Pago para pegar os detalhes completos (incluindo external_reference)
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { "Authorization": `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const paymentData = await mpResponse.json();

      statusPagamento = paymentData.status; // ex: 'approved'
      userId = paymentData.external_reference; // O ID do Firestore que passamos antes!
      valorTransacao = paymentData.transaction_amount;
      transactionId = paymentId.toString();
    } 

    // Verifica se o pagamento foi confirmado
    const isApproved = statusPagamento === "approved";

    if (isApproved && userId) {
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // Atualiza o perfil do usuário para PRO
        await userRef.update({
          isPro: true,
          subscriptionStatus: "active",
          lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Salva o log na subcoleção 'payments'
        await userRef.collection("payments").doc(transactionId).set({
          transactionId: transactionId,
          amount: valorTransacao || 0,
          status: statusPagamento,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          gateway: "Mercado Pago"
        });

        console.log(`Sucesso: Assinatura ativada para o usuário ${userId}`);
      } else {
        console.error(`Erro: Usuário com ID ${userId} não encontrado.`);
      }
    } else {
      console.log(`Ignorado: Status do pagamento (${statusPagamento}) não exige liberação ou userId vazio.`);
    }

    // Retorno 200 obrigatório para o Gateway parar de reenviar
    res.status(200).send("Webhook Recebido com Sucesso");

  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.status(200).send("Erro interno, mas requisição recebida.");
  }
});

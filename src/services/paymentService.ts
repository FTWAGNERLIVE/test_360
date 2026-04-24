import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../config/firebase"; // Ajuste o caminho se necessário

export const createPaymentLink = async (planoId?: string) => {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) {
    alert("Você precisa estar logado para assinar o LupaAI!");
    return;
  }

  try {
    console.log("Gerando link dinâmico de pagamento do Mercado Pago...");
    
    const functions = getFunctions(app);
    // Chama a nossa nova Cloud Function
    const createMercadoPagoLink = httpsCallable(functions, 'createMercadoPagoLink');
    
    const result = await createMercadoPagoLink({ planoId: planoId || 'pro' });
    const data = result.data as { checkoutUrl: string };

    if (data.checkoutUrl) {
      // Redireciona para o Mercado Pago
      window.location.href = data.checkoutUrl; 
    } else {
      alert("Erro ao gerar link de pagamento.");
    }
  } catch (error) {
    console.error("Erro ao criar link de pagamento:", error);
    alert("Falha ao comunicar com o servidor de pagamento. Tente novamente mais tarde.");
  }
};

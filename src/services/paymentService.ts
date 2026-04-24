import { getAuth } from "firebase/auth";
import { app } from "../config/firebase"; // Ajuste o caminho se necessário

export const createPaymentLink = async (planoId?: string) => {
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) {
    alert("Você precisa estar logado para assinar o LupaAI!");
    return;
  }

  try {
    console.log("Gerando link dinâmico de pagamento do Mercado Pago (Vercel API)...");
    
    const response = await fetch('/api/payment/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: user.uid,
        planoId: planoId || 'pro'
      })
    });

    const data = await response.json();

    if (data.checkoutUrl) {
      // Redireciona para o Mercado Pago
      window.location.href = data.checkoutUrl; 
    } else {
      console.error("Erro na API:", data);
      alert("Erro ao gerar link de pagamento.");
    }
  } catch (error) {
    console.error("Erro ao criar link de pagamento:", error);
    alert("Falha ao comunicar com o servidor de pagamento. Tente novamente mais tarde.");
  }
};

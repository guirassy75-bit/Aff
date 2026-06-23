// netlify/functions/create-payment.js
// Cette fonction crée un paiement Payplug côté serveur (sécurisé)
// Ta clé API Payplug est dans les variables d'environnement Netlify (jamais dans le code)

exports.handler = async function (event, context) {
  // Autoriser uniquement les requêtes POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Récupérer la clé API depuis les variables d'environnement Netlify
  const PAYPLUG_SECRET_KEY = process.env.PAYPLUG_SECRET_KEY;

  if (!PAYPLUG_SECRET_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Clé API Payplug manquante. Configure PAYPLUG_SECRET_KEY dans Netlify." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Corps de requête invalide" }) };
  }

  const { amount, currency = "EUR", email, firstname, lastname, items } = body;

  // Vérifications de base
  if (!amount || amount < 100) {
    return { statusCode: 400, body: JSON.stringify({ error: "Montant invalide (minimum 1 €)" }) };
  }
  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: "Email requis" }) };
  }

  // Construire la description des articles
  const description = items
    ? items.map((i) => `${i.name} x${i.qty}`).join(", ")
    : "Commande La Centrale Des Affaires";

  try {
    // Appel à l'API Payplug
    const response = await fetch("https://api.payplug.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYPLUG_SECRET_KEY}`,
        "Content-Type": "application/json",
        "Payplug-Version": "2019-08-06",
      },
      body: JSON.stringify({
        amount: Math.round(amount), // en centimes
        currency,
        billing: {
          email,
          first_name: firstname || "Client",
          last_name: lastname || "LCDA",
        },
        shipping: {
          email,
          first_name: firstname || "Client",
          last_name: lastname || "LCDA",
          delivery_type: "BILLING",
        },
        hosted_payment: {
          // Pages de retour après paiement
          return_url: `${process.env.URL || "http://localhost:8888"}/confirmation.html`,
          cancel_url: `${process.env.URL || "http://localhost:8888"}/checkout.html`,
        },
        notification_url: `${process.env.URL || "http://localhost:8888"}/.netlify/functions/payment-confirm`,
        metadata: {
          description,
          source: "site_lcda",
        },
      }),
    });

    const payment = await response.json();

    if (!response.ok) {
      console.error("Erreur Payplug:", payment);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: payment.message || "Erreur Payplug" }),
      };
    }

    // Retourner l'URL de paiement au client
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment_url: payment.hosted_payment?.payment_url,
        payment_id: payment.id,
      }),
    };
  } catch (err) {
    console.error("Erreur réseau:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erreur serveur : " + err.message }),
    };
  }
};

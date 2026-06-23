// netlify/functions/payment-confirm.js
// Cette fonction reçoit les notifications (webhooks) de Payplug
// Payplug appelle cette URL automatiquement quand un paiement est confirmé ou échoue

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const PAYPLUG_SECRET_KEY = process.env.PAYPLUG_SECRET_KEY;

  let notification;
  try {
    notification = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: "Corps invalide" };
  }

  console.log("Notification Payplug reçue:", JSON.stringify(notification, null, 2));

  // Vérifier le type de notification
  const { id, is_paid, failure, metadata } = notification;

  if (is_paid) {
    // ✅ Paiement réussi
    console.log(`✅ Paiement ${id} confirmé. Description: ${metadata?.description}`);

    // TODO : ici tu peux :
    // - Envoyer un email de confirmation (via SendGrid, Mailgun, etc.)
    // - Enregistrer la commande dans une base de données (Supabase, Airtable, etc.)
    // - Notifier ton équipe par SMS ou email

  } else if (failure) {
    // ❌ Paiement échoué
    console.log(`❌ Paiement ${id} échoué. Raison: ${failure.message}`);
  }

  // Toujours répondre 200 à Payplug pour confirmer la réception
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};

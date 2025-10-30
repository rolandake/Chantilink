// Simuler un appel à GPT pour tester
export async function sendMessage(req, res) {
  const { message } = req.body;
  let gptResponse = `Réponse automatique : "${message}"`; // remplacer par l'appel réel à OpenAI

  // Simuler délai
  await new Promise((r) => setTimeout(r, 500));

  res.json({ gptMessage: { content: gptResponse } });
}

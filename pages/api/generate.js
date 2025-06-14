export default async function handler(req, res) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY; // <-- Lee la clave de forma segura desde las variables de entorno

  // Validaciones de seguridad
  if (!apiKey) {
    console.error('GEMINI_API_KEY no está configurada en el servidor.');
    return res.status(500).json({ error: 'Error de configuración del servidor: la clave de API no está disponible.' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'El prompt es requerido.' });
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error('Error de la API de Gemini:', errorBody);
      throw new Error(`Error en la API de Google: ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const generatedText = result.candidates[0].content.parts[0].text;
      res.status(200).json({ text: generatedText });
    } else {
      const reason = result.promptFeedback?.blockReason || 'Respuesta vacía o con formato incorrecto.';
      res.status(500).json({ error: `No se pudo generar el prompt. Razón: ${reason}` });
    }
  } catch (error) {
    console.error('Error al llamar a la API de Gemini:', error);
    res.status(500).json({ error: 'Ocurrió un error al contactar al servicio de IA.' });
  }
}
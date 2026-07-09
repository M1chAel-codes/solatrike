import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/parse', async (req, res) => {
  try {
    const { userText, apiKey } = req.body;
    console.log('📨 Got request:', userText, '| Key exists:', !!apiKey);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a Solana transaction parser. Extract amount and recipient wallet from: "${userText}". Return ONLY JSON with no markdown: {"amount": number, "recipient": "wallet_address"}. If unparseable return {"error": "Cannot parse"}` }] }]
        }),
      }
    );

    const data = await response.json();
    console.log('🤖 Gemini response:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0]) {
      return res.status(400).json({ error: 'No response from Gemini' });
    }

    const content = data.candidates[0].content.parts[0].text;
    const clean = content.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));

  } catch (error) {
    console.error('💥 Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});
// THIS KEEPS YOUR SERVER ALIVE AND LISTENING!
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Transaction Parser Backend running on http://localhost:${PORT}`);
});
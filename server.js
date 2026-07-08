import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/parse', async (req, res) => {
  try {
    const { userText, apiKey } = req.body;
    console.log('📩 Got request:', userText, '| Key exists:', !!apiKey);

    // 1. TEMPORARILY COMMENT OUT GEMINI CALL WHILE THEY ARE 503
    /*
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, { ... });
    const data = await response.json();
    ...
    const parsed = JSON.parse(content);
    res.json(parsed);
    */

    // 2. HARDCODE A MOCK SUCCESS RESPONSE FOR TESTING RIGHT NOW
    console.log('🤖 Bypassing Gemini with temporary test data...');
    res.json({
      amount: 0.1,
      recipient: "6Q3VKqu4ewxErvN1dbfAAvqku6GZQZjkSpineaej1Tvk"
    });

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
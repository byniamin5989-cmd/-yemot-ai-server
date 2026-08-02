// שרת AI לקו ימות המשיח - מתחבר ל-Gemini
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const YEMOT_TOKEN = process.env.YEMOT_TOKEN;
const GEMINI_MODEL = 'gemini-2.0-flash';

const SYSTEM_INSTRUCTION =
  'אתה עוזר קולי טלפוני בעברית. ' +
  'ענה תמיד בעברית, בקצרה (1-3 משפטים לכל היותר), בשפה פשוטה וברורה. ' +
  'אל תשתמש בכוכביות, סימני מרקדאון, רשימות ממוספרות או תווים מיוחדים - ' +
  'התשובה תושמע בקול, לא תוצג בכתב.';

async function downloadFileByPath(rawPath) {
  let path = rawPath;
  if (!path.includes('ivr2:/')) {
    path = path.replace('ivr2:', 'ivr2:/');
  }
  const url = `https://www.call2all.co.il/ym/api/DownloadFile?token=${encodeURIComponent(YEMOT_TOKEN)}&path=${encodeURIComponent(path)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`404_OR_ERROR_${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function findLatestRecording(folderPath) {
  let lastGoodBuffer = null;
  let lastGoodName = null;
  let consecutiveFailures = 0;

  for (let i = 0; i < 300; i++) {
    const num = String(i).padStart(3, '0');
    const candidatePath = `${folderPath}/${num}.wav`;
    try {
      const buf = await downloadFileByPath(candidatePath);
      lastGoodBuffer = buf;
      lastGoodName = candidatePath;
      consecutiveFailures = 0;
    } catch (e) {
      consecutiveFailures++;
      if (lastGoodBuffer) break;
      if (consecutiveFailures > 3) break;
    }
  }

  if (!lastGoodBuffer) {
    throw new Error('לא נמצאה אף הקלטה בתיקייה: ' + folderPath);
  }
  console.log('נמצאה הקלטה אחרונה:', lastGoodName);
  return lastGoodBuffer;
}

async function askGeminiText(userText) {
  if (!GEMINI_API_KEY) throw new Error('חסר GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'מצטער, לא הצלחתי להבין.';
}

async function askGeminiAudio(audioBuffer, mimeType) {
  if (!GEMINI_API_KEY) throw new Error('חסר GEMINI_API_KEY');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const base64Audio = audioBuffer.toString('base64');
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mimeType, data: base64Audio } },
        { text: 'זו הקלטה של מתקשר לקו טלפוני. תקשיב למה שהוא אומר ותענה לו ישירות בעברית.' },
      ],
    }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
  };
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'מצטער, לא הצלחתי להבין את ההקלטה.';
}

function cleanForYemotSpeech(text) {
  return text.replace(/[\r\n]+/g, ' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

app.all('/api/talk', async (req, res) => {
  const params = { ...req.query, ...req.body };
  console.log('התקבל מימות:', params);

  try {
    const apiExtension = String(params.ApiExtension || '');
    const folderPath = 'ivr2:' + apiExtension.replace(/\/api$/, '');

    const userText = params.text || params.hazara || params.ApiPath0 || params.transcript || '';

    let aiReply;

    if (userText) {
      aiReply = await askGeminiText(String(userText));
    } else {
      console.log('מחפש הקלטה אחרונה בתיקייה:', folderPath);
      const audioBuffer = await findLatestRecording(folderPath);
      aiReply = await askGeminiAudio(audioBuffer, 'audio/wav');
    }

    const speech = cleanForYemotSpeech(aiReply);
    res.type('text/plain').send(`read=t-${speech},yes,no,,,no`);
  } catch (err) {
    console.error('שגיאה:', err.message);
    res.type('text/plain').send('read=t-קרתה שגיאה זמנית, נסו שוב בעוד רגע,yes,no,,,no');
  }
});

app.get('/', (req, res) => {
  res.send('שרת ה-AI לקו ימות המשיח פעיל ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`השרת רץ על פורט ${PORT}`);
});

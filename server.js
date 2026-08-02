// שרת AI לקו ימות המשיח - מתחבר ל-Gemini
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// המפתח נלקח ממשתנה סביבה (Environment Variable) - לא כתוב בקוד!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash';

// הנחיה קבועה ל-AI: לענות בעברית, קצר, בלי עיצוב, מתאים להשמעה קולית
const SYSTEM_INSTRUCTION =
  'אתה עוזר קולי טלפוני בעברית. ' +
  'ענה תמיד בעברית, בקצרה (1-3 משפטים לכל היותר), בשפה פשוטה וברורה. ' +
  'אל תשתמש בכוכביות, סימני מרקדאון, רשימות ממוספרות או תווים מיוחדים - ' +
  'התשובה תושמע בקול, לא תוצג בכתב.';

// פונקציה ששולחת את השאלה ל-Gemini ומחזירה את התשובה
async function askGemini(userText) {
  if (!GEMINI_API_KEY) {
    throw new Error('חסר מפתח GEMINI_API_KEY במשתני הסביבה');
  }

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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return reply || 'מצטער, לא הצלחתי להבין. אפשר לנסות שוב?';
}

// ניקוי טקסט כדי שיהיה בטוח להשמעה בפורמט של ימות (בלי פסיקים/שורות חדשות)
function cleanForYemotSpeech(text) {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// נקודת הכניסה שממנה ימות המשיח יקרא (api_link בקובץ ext.ini)
// תומך גם ב-GET וגם ב-POST כי לא תמיד ברור מראש איך ימות שולח
app.all('/api/talk', async (req, res) => {
  const params = { ...req.query, ...req.body };
  console.log('התקבל מימות:', params);

  try {
    // חיפוש הטקסט המתומלל בפרמטרים הנפוצים - יש להתאים לפי מה שבפועל מגיע
    const userText =
      params.text || params.hazara || params.ApiPath0 || params.transcript || '';

    if (!userText) {
      res.type('text/plain').send('read=t-לא שמעתי כלום, אפשר לחזור על זה בבקשה,yes,no,,,no');
      return;
    }

    const aiReply = await askGemini(String(userText));
    const speech = cleanForYemotSpeech(aiReply);

    // מחזיר לימות פקודת "read" שתשמיע את הטקסט בקול
    res.type('text/plain').send(`read=t-${speech},yes,no,,,no`);
  } catch (err) {
    console.error('שגיאה:', err.message);
    res.type('text/plain').send('read=t-קרתה שגיאה זמנית, נסו שוב בעוד רגע,yes,no,,,no');
  }
});

// דף בדיקה פשוט - כדי לוודא שהשרת חי
app.get('/', (req, res) => {
  res.send('שרת ה-AI לקו ימות המשיח פעיל ✅');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`השרת רץ על פורט ${PORT}`);
});

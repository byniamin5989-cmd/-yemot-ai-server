# שרת AI לקו ימות המשיח

שרת קטן שמקבל טקסט (תמלול דיבור מהשלוחה שלך בימות), שולח אותו ל-Gemini, ומחזיר תשובה שימות יכול להשמיע בקול.

## שלב 1: פריסה (Deploy) ב-Render.com בחינם

1. היכנס ל-render.com והירשם (אפשר עם חשבון GitHub).
2. לחץ New + ואז Web Service.
3. חבר את ה-repository הזה (yemot-ai-server).
4. הגדרות: Build Command: npm install , Start Command: npm start , Instance Type: Free
5. בלשונית Environment, הוסף משתנה סביבה בשם GEMINI_API_KEY עם הערך של המפתח שלך.
6. לחץ Create Web Service וחכה כמה דקות.
7. תקבל כתובת כמו: https://yemot-ai-server.onrender.com

## שלב 2: חיבור לימות המשיח

בקובץ ext.ini של השלוחה, הגדר:
type=api
title=קו AI
api_link=https://yemot-ai-server.onrender.com/api/talk

## הערה על Render החינמי

בטייר החינמי, השרת נרדם אחרי כמה דקות של חוסר פעילות, וההתעוררות הראשונה יכולה לקחת כ-30-60 שניות.

## בדיקה שהשרת עובד

פתח בדפדפן את הכתובת שקיבלת (בלי /api/talk בסוף) - אמור להופיע "שרת ה-AI לקו ימות המשיח פעיל".

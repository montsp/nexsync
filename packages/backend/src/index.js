const express = require('express');
const session = require('express-session'); // express-sessionをインポート
require('dotenv').config();
const authRoutes = require('./api/auth.routes');

const app = express();
const port = process.env.PORT || 3001;

// JSONリクエストボディを解析するためのミドルウェア
app.use(express.json());

// セッションミドルウェアの設定
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // 本番環境ではhttpsを強制
        maxAge: 1000 * 60 * 60 * 24 // 24時間
    }
}));

// ルートの設定
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to NexSync API' });
});

// 認証ルートを /api/auth パスにマウント
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

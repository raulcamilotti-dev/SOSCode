// ===============================
// IMPORTS
// ===============================
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// ===============================
// APP & MIDDLEWARE
// ===============================
const app = express();
app.use(cors());
app.use(express.json());

// ===============================
// DATABASE
// ===============================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ===============================
// CONSTANTS
// ===============================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// ===============================
// HEALTH CHECK
// ===============================
app.get('/', (req, res) => {
  res.json({ status: 'API Portal rodando' });
});

// ===============================
// AUTH – REQUEST CODE
// ===============================
app.post('/auth/request-code', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'Telefone obrigatório' });
  }

  try {
    // 1. Buscar ou criar usuário
    let user;
    const userResult = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );

    if (userResult.rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO users (phone, role)
         VALUES ($1, 'client')
         RETURNING *`,
        [phone]
      );
      user = insert.rows[0];
    } else {
      user = userResult.rows[0];
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Usuário inativo' });
    }

    // 2. Gerar código
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await pool.query(
      `
      INSERT INTO auth_codes
      (user_id, code, expires_at, channel, destination)
      VALUES ($1, $2, $3, 'whatsapp', $4)
      `,
      [user.id, code, expiresAt, phone]
    );

    // 3. Aqui entra o n8n (por enquanto log)
    console.log(`LOGIN CODE ${code} ? ${phone}`);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===============================
// AUTH – VERIFY CODE
// ===============================
app.post('/auth/verify', async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: 'Telefone e código obrigatórios' });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        ac.id AS auth_code_id,
        ac.user_id,
        u.role
      FROM auth_codes ac
      JOIN users u ON u.id = ac.user_id
      WHERE ac.code = $1
        AND ac.destination = $2
        AND ac.used_at IS NULL
        AND ac.expires_at > now()
      ORDER BY ac.created_at DESC
      LIMIT 1
      `,
      [code, phone]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Código inválido ou expirado' });
    }

    const authCode = result.rows[0];

    // Marcar código como usado
    await pool.query(
      'UPDATE auth_codes SET used_at = now() WHERE id = $1',
      [authCode.auth_code_id]
    );

    // Gerar JWT
    const token = jwt.sign(
      {
        sub: authCode.user_id,
        role: authCode.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ===============================
// AUTH MIDDLEWARE
// ===============================
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.sendStatus(401);

  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// ===============================
// ME (TESTE DE LOGIN)
// ===============================
app.get('/me', auth, (req, res) => {
  res.json({
    user_id: req.user.sub,
    role: req.user.role,
  });
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log('API rodando na porta', PORT);
});

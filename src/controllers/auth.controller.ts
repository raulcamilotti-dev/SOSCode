import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db";

const JWT_SECRET = process.env.JWT_SECRET!;

// 🔐 LOGIN
export async function login(req: Request, res: Response) {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ message: "CPF e senha obrigatórios" });
  }

  const result = await db.query(
    "SELECT id, nome, cpf, email, password FROM users WHERE cpf = $1",
    [cpf]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: "Usuário não encontrado" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: "Senha inválida" });
  }

  const token = jwt.sign(
    { id: user.id, cpf: user.cpf },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      nome: user.nome,
      cpf: user.cpf,
      email: user.email,
    },
  });
}

// 📝 REGISTER
export async function register(req: Request, res: Response) {
  const { nome, cpf, email, telefone, password } = req.body;

  if (!nome || !cpf || !email || !telefone || !password) {
    return res.status(400).json({ message: "Dados incompletos" });
  }

  const exists = await db.query(
    "SELECT id FROM users WHERE cpf = $1",
    [cpf]
  );

  if (exists.rows.length > 0) {
    return res.status(400).json({ message: "CPF já cadastrado" });
  }

  const hash = await bcrypt.hash(password, 10);

  await db.query(
    `
    INSERT INTO users (nome, cpf, email, telefone, password)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [nome, cpf, email, telefone, hash]
  );

  return res.json({ ok: true });
}
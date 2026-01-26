import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * REGISTER
 */
export async function register(req: Request, res: Response) {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ message: "CPF e senha obrigatórios" });
  }

  // verifica se já existe
  const exists = await db.query(
    "SELECT id FROM users WHERE cpf = $1",
    [cpf]
  );

  if (exists.rowCount > 0) {
    return res.status(409).json({ message: "Usuário já existe" });
  }

  const hash = await bcrypt.hash(password, 10);

  const result = await db.query(
    "INSERT INTO users (cpf, password) VALUES ($1, $2) RETURNING id, cpf",
    [cpf, hash]
  );

  return res.status(201).json(result.rows[0]);
}

/**
 * LOGIN
 */
export async function login(req: Request, res: Response) {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ message: "CPF e senha obrigatórios" });
  }

  const result = await db.query(
    "SELECT id, cpf, password FROM users WHERE cpf = $1",
    [cpf]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  const token = jwt.sign(
    { id: user.id, cpf: user.cpf },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res.json({ token });
}

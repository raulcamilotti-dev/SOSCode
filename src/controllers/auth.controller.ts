import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "../db";

const JWT_SECRET = process.env.JWT_SECRET!;

interface AuthBody {
  cpf: string;
  password: string;
}

/**
 * REGISTER
 */
export async function register(req: Request, res: Response) {
  const { cpf, password } = req.body as AuthBody;

  if (!cpf || !password) {
    return res.status(400).json({ message: "CPF e senha obrigatórios" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await db.query(
      "INSERT INTO users (cpf, password) VALUES ($1, $2)",
      [cpf, hashedPassword]
    );

    return res.status(201).json({ message: "Usuário criado" });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Usuário já existe" });
    }

    return res.status(500).json({ message: "Erro ao criar usuário" });
  }
}

/**
 * LOGIN
 */
export async function login(req: Request, res: Response) {
  const { cpf, password } = req.body as AuthBody;

  if (!cpf || !password) {
    return res.status(400).json({ message: "CPF e senha obrigatórios" });
  }

  const result = await db.query(
    "SELECT id, password FROM users WHERE cpf = $1",
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
    { userId: user.id },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res.json({ token });
}

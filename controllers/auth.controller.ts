import { Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

import { v4 as uuidv4 } from "uuid";
import db from "../db";

const SALT_ROUNDS = 10;

export async function register(req: Request, res: Response) {
  try {
    const { name, cpf, email, phone, password } = req.body;

    if (!name || !cpf || !email || !phone || !password) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const existing = await db.query(
      "SELECT id FROM users WHERE cpf = $1 OR email = $2",
      [cpf, email]
    );

if ((existing.rowCount ?? 0) > 0) {

      return res.status(409).json({ message: "Usuário já cadastrado" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await db.query(
      `
      INSERT INTO users (
        id, name, cpf, email, phone,
        password_hash, role, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'client', true)
      `,
      [uuidv4(), name, cpf, email, phone, passwordHash]
    );

    return res.status(201).json({ message: "Conta criada com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { cpf, password } = req.body;

    if (!cpf || !password) {
      return res.status(400).json({ message: "CPF e senha obrigatórios" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE cpf = $1 AND is_active = true",
      [cpf]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        cpf: user.cpf,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erro interno" });
  }
}

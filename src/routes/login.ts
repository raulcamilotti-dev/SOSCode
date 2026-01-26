import jwt from "jsonwebtoken";
import { Request, Response } from "express";
import db from "../db";
import bcrypt from "bcrypt";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function login(req: Request, res: Response) {
  const { cpf, password } = req.body;

  if (!cpf || !password) {
    return res.status(400).json({ message: "CPF e senha obrigatórios" });
  }

  const result = await db.query(
    "SELECT id, name, cpf, password_hash, role FROM users WHERE cpf = $1 AND is_active = true",
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
    {
      sub: user.id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      cpf: user.cpf,
      role: user.role,
    },
  });
}

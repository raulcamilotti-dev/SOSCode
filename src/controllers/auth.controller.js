"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const bcrypt = __importStar(require("bcrypt"));
const jwt = __importStar(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const db_1 = __importDefault(require("../db"));
const SALT_ROUNDS = 10;
async function register(req, res) {
    var _a;
    try {
        const { name, cpf, email, phone, password } = req.body;
        if (!name || !cpf || !email || !phone || !password) {
            return res.status(400).json({ message: "Dados incompletos" });
        }
        const existing = await db_1.default.query("SELECT id FROM users WHERE cpf = $1 OR email = $2", [cpf, email]);
        if (((_a = existing.rowCount) !== null && _a !== void 0 ? _a : 0) > 0) {
            return res.status(409).json({ message: "Usuário já cadastrado" });
        }
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        await db_1.default.query(`
      INSERT INTO users (
        id, name, cpf, email, phone,
        password_hash, role, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'client', true)
      `, [(0, uuid_1.v4)(), name, cpf, email, phone, passwordHash]);
        return res.status(201).json({ message: "Conta criada com sucesso" });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erro interno" });
    }
}
async function login(req, res) {
    try {
        const { cpf, password } = req.body;
        if (!cpf || !password) {
            return res.status(400).json({ message: "CPF e senha obrigatórios" });
        }
        const result = await db_1.default.query("SELECT * FROM users WHERE cpf = $1 AND is_active = true", [cpf]);
        if (result.rowCount === 0) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return res.json({
            user: {
                id: user.id,
                name: user.name,
                cpf: user.cpf,
                role: user.role,
            },
            token,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erro interno" });
    }
}

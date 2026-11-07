'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const config = require('../config');
const { AppError } = require('../errors');

const BCRYPT_ROUNDS = 12;
// Hash de relleno: si el email no existe, comparamos igualmente para que la
// respuesta tarde lo mismo y no revele qué emails están registrados.
const DUMMY_HASH = bcrypt.hashSync('contraseña-de-relleno', BCRYPT_ROUNDS);

async function register(email, password) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash],
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new AppError(409, 'Ya existe un usuario con ese email', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

async function login(email, password) {
  const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email = $1', [email]);
  const user = rows[0];
  const valid = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !valid) {
    // Mismo mensaje en ambos casos: no decimos si falla el email o la contraseña.
    throw new AppError(401, 'Credenciales incorrectas', 'INVALID_CREDENTIALS');
  }

  const token = jwt.sign({}, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: config.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  });
  return { token };
}

module.exports = { register, login };

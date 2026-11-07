'use strict';

const authService = require('../services/auth.service');

async function register(req, res) {
  const { email, password } = req.validated.body;
  const user = await authService.register(email, password);
  res.status(201).json({ id: user.id, email: user.email, createdAt: user.created_at });
}

async function login(req, res) {
  const { email, password } = req.validated.body;
  const result = await authService.login(email, password);
  res.json(result);
}

module.exports = { register, login };

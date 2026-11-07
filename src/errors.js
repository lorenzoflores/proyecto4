'use strict';

// Error con código HTTP. El manejador central lo convierte en una respuesta JSON.
class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

module.exports = { AppError };

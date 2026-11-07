'use strict';

const { AppError } = require('../errors');

// Valida req[source] con un esquema de zod y lo sustituye por los datos validados.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join('; ');
      return next(new AppError(400, message, 'VALIDATION_ERROR'));
    }
    // En Express 5 req.query y req.params son de solo lectura: guardamos el resultado aparte.
    req.validated = { ...req.validated, [source]: result.data };
    return next();
  };
}

module.exports = validate;

'use strict';

// Detecta el tipo real de un fichero por su contenido ("magic bytes"),
// sin fiarse de la extensión ni del Content-Type que manda el cliente.

const SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
];

function startsWith(buffer, bytes) {
  return buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte);
}

function isPlainText(buffer) {
  if (buffer.includes(0x00)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

// Devuelve el tipo MIME detectado o null si no es un tipo permitido.
function detectFileType(buffer) {
  const match = SIGNATURES.find((signature) => startsWith(buffer, signature.bytes));
  if (match) return match.mime;
  if (buffer.length > 0 && isPlainText(buffer)) return 'text/plain';
  return null;
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];

module.exports = { detectFileType, ALLOWED_TYPES };

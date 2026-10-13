/** Error de validación de una operación de negocio (dato inválido). */
export class ValidationError extends Error {
  constructor(code, message) { super(message || code); this.name = 'ValidationError'; this.code = code; }
}

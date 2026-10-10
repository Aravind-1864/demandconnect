const ApiError = require("../utils/ApiError");

/**
 * Validates and replaces req.body / req.query / req.params with the parsed
 * (trimmed, coerced, stripped) output of a Zod schema.
 *   router.post("/", validate({ body: createSchema }), handler)
 */
const validate = (schemas) => (req, _res, next) => {
  for (const part of ["params", "query", "body"]) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part]);
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return next(ApiError.badRequest(errors[0]?.message || "Validation failed", errors));
    }
    // req.query is a getter in Express 5, so define rather than assign.
    Object.defineProperty(req, part, { value: result.data, writable: true, configurable: true });
  }
  next();
};

module.exports = validate;

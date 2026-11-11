// Express 4 does not catch errors from async handlers by itself.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

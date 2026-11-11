// Central error handler: always responds with JSON.
module.exports = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Resume must be 5 MB or smaller' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === 11000) {
    return res.status(400).json({ message: 'User already exists' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);

  const message =
    status === 500 && process.env.NODE_ENV === 'production' ? 'Server error' : err.message;
  res.status(status).json({ message });
};

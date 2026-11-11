const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(), // file stays in memory, we only need its text
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    const err = new Error('Only PDF resumes are allowed');
    err.status = 400;
    cb(err);
  },
});

module.exports = upload;

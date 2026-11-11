const { Router } = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const asyncHandler = require('../middleware/asyncHandler');
const upload = require('../middleware/file.middleware');
const {
  generateReport,
  getReports,
  getReportById,
  deleteReport,
  generateResumePdf,
} = require('../controller/interview.controller');

const interviewRouter = Router();

// every interview route needs a logged-in user
interviewRouter.use(authenticate);

interviewRouter.post('/', upload.single('resume'), asyncHandler(generateReport));
interviewRouter.get('/', asyncHandler(getReports));
interviewRouter.post('/resume/pdf/:id', asyncHandler(generateResumePdf));
interviewRouter.get('/:id', asyncHandler(getReportById));
interviewRouter.delete('/:id', asyncHandler(deleteReport));

module.exports = interviewRouter;

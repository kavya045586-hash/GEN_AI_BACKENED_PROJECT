const mongoose = require('mongoose');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const InterviewReport = require('../models/interviewReport.model');
const { generateInterviewReport, generateResumeData } = require('../services/ai.service');
const { buildResumePdf } = require('../services/pdf.service');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// POST /api/interview   (multipart/form-data: resume[file], jobDescription, selfDescription)
async function generateReport(req, res) {
  const jobDescription = String(req.body.jobDescription || '').trim();
  const selfDescription = String(req.body.selfDescription || '').trim();
  let resumeText = String(req.body.resumeText || '').trim(); // optional: paste text instead of a file

  if (req.file) {
    // pdf-parse bundles an old PDF.js that misreads pooled Node Buffers (small files),
    // so hand it a fresh copy: new Uint8Array(...) always starts at byte offset 0.
    const parsed = await pdfParse(new Uint8Array(req.file.buffer)).catch(() => null);
    if (!parsed) {
      return res.status(400).json({ message: 'Could not read this PDF. Try exporting it again.' });
    }
    resumeText = (parsed.text || '').trim();
    if (!resumeText) {
      return res.status(400).json({
        message: 'Could not read any text from this PDF. It may be a scanned image.',
      });
    }
  }

  if (!jobDescription) {
    return res.status(400).json({ message: 'jobDescription is required' });
  }
  if (!resumeText && !selfDescription) {
    return res.status(400).json({ message: 'Provide a resume PDF or a selfDescription' });
  }

  const aiReport = await generateInterviewReport({ resumeText, selfDescription, jobDescription });

  const report = await InterviewReport.create({
    user: req.user.id,
    jobDescription,
    resume: resumeText,
    selfDescription,
    ...aiReport,
  });

  return res.status(201).json({ message: 'Interview report generated successfully', report });
}

// GET /api/interview
async function getReports(req, res) {
  const reports = await InterviewReport.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select('title matchScore createdAt');
  return res.status(200).json({ reports });
}

// GET /api/interview/:id
async function getReportById(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid report id' });

  const report = await InterviewReport.findOne({ _id: id, user: req.user.id });
  if (!report) return res.status(404).json({ message: 'Report not found' });

  return res.status(200).json({ report });
}

// DELETE /api/interview/:id
async function deleteReport(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid report id' });

  const report = await InterviewReport.findOneAndDelete({ _id: id, user: req.user.id });
  if (!report) return res.status(404).json({ message: 'Report not found' });

  return res.status(200).json({ message: 'Report deleted' });
}

// POST /api/interview/resume/pdf/:id  -> downloads a tailored resume PDF
async function generateResumePdf(req, res) {
  const { id } = req.params;
  if (!isValidId(id)) return res.status(400).json({ message: 'Invalid report id' });

  const report = await InterviewReport.findOne({ _id: id, user: req.user.id });
  if (!report) return res.status(404).json({ message: 'Report not found' });

  const resumeData = await generateResumeData({
    resumeText: report.resume,
    selfDescription: report.selfDescription,
    jobDescription: report.jobDescription,
  });

  const pdfBuffer = await buildResumePdf(resumeData);

  const safeName = (resumeData.name || 'resume').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'resume';
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${safeName}_resume.pdf"`,
    'Content-Length': pdfBuffer.length,
  });
  return res.status(200).send(pdfBuffer);
}

module.exports = { generateReport, getReports, getReportById, deleteReport, generateResumePdf };

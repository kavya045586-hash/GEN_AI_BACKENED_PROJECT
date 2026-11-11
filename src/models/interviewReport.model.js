const mongoose = require('mongoose');

const qaSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    intention: { type: String, default: '' },
    answer: { type: String, default: '' },
  },
  { _id: false }
);

const skillGapSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  },
  { _id: false }
);

const planDaySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    focus: { type: String, required: true },
    tasks: { type: [String], default: [] },
  },
  { _id: false }
);

const interviewReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, default: 'Interview Report' }, // target role
    jobDescription: { type: String, required: true },
    resume: { type: String, default: '' }, // extracted resume text
    selfDescription: { type: String, default: '' },
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    technicalQuestions: { type: [qaSchema], default: [] },
    behavioralQuestions: { type: [qaSchema], default: [] },
    skillGaps: { type: [skillGapSchema], default: [] },
    preparationPlan: { type: [planDaySchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InterviewReport', interviewReportSchema);

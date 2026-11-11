const PDFDocument = require('pdfkit');

// The built-in PDF fonts only support basic Latin characters, so normalise the text.
const clean = (value) =>
  String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u2022\u25CF\u25AA]/g, '-')
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '')
    .trim();

/**
 * Builds a plain black-and-white, ATS-friendly resume PDF.
 * @param {object} data - validated resume JSON from ai.service
 * @returns {Promise<Buffer>}
 */
function buildResumePdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const width = doc.page.width - left - doc.page.margins.right;
    const right = left + width;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom;

    const ensureSpace = (needed = 40) => {
      if (doc.y > bottomLimit() - needed) doc.addPage();
    };

    const heading = (text) => {
      ensureSpace(60);
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000')
        .text(clean(text).toUpperCase(), left, doc.y, { width });
      const lineY = doc.y + 2;
      doc.moveTo(left, lineY).lineTo(right, lineY).lineWidth(0.8).strokeColor('#000000').stroke();
      doc.y = lineY + 6;
    };

    // Bold title on the left, italic grey dates right-aligned on the same line
    const entryHeader = (title, dates) => {
      ensureSpace(50);
      const y = doc.y;
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#000000')
        .text(clean(title), left, y, { width: dates ? width - 130 : width });
      const afterTitle = doc.y;
      if (dates) {
        doc.font('Helvetica-Oblique').fontSize(9.5).fillColor('#666666')
          .text(clean(dates), left, y, { width, align: 'right' });
      }
      doc.y = Math.max(afterTitle, doc.y);
    };

    const subLine = (text) => {
      if (!clean(text)) return;
      doc.font('Helvetica').fontSize(10).fillColor('#000000').text(clean(text), left, doc.y, { width });
    };

    const bullets = (items = []) => {
      items.map(clean).filter(Boolean).forEach((item) => {
        ensureSpace(30);
        const y = doc.y;
        doc.font('Helvetica').fontSize(10).fillColor('#000000');
        doc.text('\u2022', left + 2, y, { width: 10, lineBreak: false });
        doc.text(item, left + 14, y, { width: width - 14 });
      });
      doc.moveDown(0.4);
    };

    // ----- header -----
    doc.font('Helvetica-Bold').fontSize(22).fillColor('#000000')
      .text(clean(data.name) || 'Your Name', left, doc.y, { width, align: 'left' });

    const contact = [data.email, data.phone, data.location, ...(data.links || [])]
      .map(clean).filter(Boolean).join('  |  ');
    if (contact) {
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(9.5).fillColor('#000000').text(contact, left, doc.y, { width });
    }

    // ----- sections -----
    if (clean(data.summary)) {
      heading('Summary');
      doc.font('Helvetica').fontSize(10).fillColor('#000000').text(clean(data.summary), left, doc.y, { width });
    }

    const skills = (data.skills || []).map(clean).filter(Boolean);
    if (skills.length) {
      heading('Skills');
      doc.font('Helvetica').fontSize(10).fillColor('#000000').text(skills.join(', '), left, doc.y, { width });
    }

    if ((data.experience || []).length) {
      heading('Experience');
      data.experience.forEach((job) => {
        entryHeader(job.title, job.dates);
        subLine(job.company);
        doc.moveDown(0.2);
        bullets(job.bullets);
      });
    }

    if ((data.projects || []).length) {
      heading('Projects');
      data.projects.forEach((p) => {
        entryHeader(p.name, p.dates);
        doc.moveDown(0.2);
        bullets(p.bullets);
      });
    }

    if ((data.education || []).length) {
      heading('Education');
      data.education.forEach((e) => {
        entryHeader(e.degree, e.dates);
        subLine(e.institution);
        doc.moveDown(0.6);
      });
    }

    doc.end();
  });
}

module.exports = { buildResumePdf };

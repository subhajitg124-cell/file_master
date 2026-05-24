import { PDFDocument } from 'pdf-lib';
import { expose } from 'comlink';

async function mergePdfs(filesData: { name: string; buffer: ArrayBuffer }[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const fileData of filesData) {
    const pdf = await PDFDocument.load(fileData.buffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}

async function compressPdf(fileData: { name: string; buffer: ArrayBuffer }, quality: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(fileData.buffer);
  
  // High quality -> do nothing except re-save (stripping metadata if any)
  // Medium / Low quality -> we can rebuild with basic compression settings
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  
  return await pdfDoc.save({ useObjectStreams: quality < 80 });
}

expose({ mergePdfs, compressPdf });

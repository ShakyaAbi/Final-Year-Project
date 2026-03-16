import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
// Using standard CDN for worker. In production, it's better to bundle this or host it locally.
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedPDFData {
  text: string;
  suggestedDate?: string;
  suggestedValue?: string;
}

/**
 * Extracts raw text from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }

    return fullText;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Could not extract text from PDF file');
  }
}

/**
 * Attempts to parse meaningful data (date, value) from the raw text
 */
export function parseDataFromText(text: string): ParsedPDFData {
  const result: ParsedPDFData = {
    text,
  };

  // 1. Try to find a date
  // Matches common formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, etc.
  // This is a naive regex and will just pick the first match
  const dateRegex = /\b(20\d{2}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]20\d{2})\b/;
  const dateMatch = text.match(dateRegex);
  
  if (dateMatch) {
    // Try to normalize to YYYY-MM-DD for the date input
    try {
      let rawDate = dateMatch[1].replace(/\//g, '-');
      // If it looks like MM-DD-YYYY or DD-MM-YYYY, JS Date parsing can be tricky, 
      // but let's just use naive Date() constructor for now.
      // E.g. Date('01-15-2024') works in most browsers.
      const d = new Date(rawDate);
      if (!Number.isNaN(d.getTime())) {
        result.suggestedDate = d.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // 2. Try to find a value
  // This is extremely naive: finds the first number that isn't part of a date or year.
  // In a real app, we'd look for keywords like "Value: 123" or "Total: 123"
  // Let's look for "Value:" or "Total:" or "Amount:" followed by a number
  const valueRegex = /(?:value|total|amount|count|score)\s*[:=]?\s*[\$£€]?\s*([\d,]+(?:\.\d+)?)/i;
  const valueMatch = text.match(valueRegex);
  if (valueMatch) {
    // remove commas
    const cleanNum = valueMatch[1].replace(/,/g, '');
    if (!Number.isNaN(Number(cleanNum))) {
      result.suggestedValue = cleanNum;
    }
  }

  return result;
}

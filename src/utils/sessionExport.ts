import { ColumnType, SessionState, Ticket, User } from '../types';

type ExportLine = {
  text: string;
  size: number;
  gapBefore?: number;
};

type PdfPalette = {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  text: string;
  textMuted: string;
  border: string;
  ticketBackground: string;
  white: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const DEFAULT_PALETTE: PdfPalette = {
  background: '#f8fafc',
  surface: '#ffffff',
  primary: '#4f46e5',
  secondary: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  ticketBackground: '#ffffff',
  white: '#ffffff'
};

const COLUMN_ACCENTS: Record<string, string> = {
  [ColumnType.WELL]: '#10b981',
  [ColumnType.LESS_WELL]: '#f43f5e',
  [ColumnType.TRY_NEXT]: '#0ea5e9',
  [ColumnType.PUZZLES]: '#f59e0b'
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);

const formatOptionalDateTime = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateTime(date);
};

const getTicketThemeName = (session: SessionState, ticket: Ticket) =>
  session.themes.find(theme => theme.id === ticket.themeId)?.name || 'Ungrouped';

const sanitizeFilename = (value: string) =>
  value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'session';

const wrapText = (text: string, size: number, width = CONTENT_WIDTH) => {
  const maxChars = Math.max(18, Math.floor(width / (size * 0.52)));
  const words = String(text || '').split(/\s+/);
  const lines: string[] = [];
  let current = '';

  words.forEach(word => {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars));
      }
      return;
    }

    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
};

const addWrapped = (lines: ExportLine[], text: string, size = 11, gapBefore = 0) => {
  wrapText(text, size).forEach((line, index) => {
    lines.push({ text: line, size, gapBefore: index === 0 ? gapBefore : 0 });
  });
};

const addSection = (lines: ExportLine[], title: string) => {
  lines.push({ text: title, size: 16, gapBefore: 18 });
};

export const buildSessionExportLines = (
  session: SessionState,
  _participants: User[],
  exportedAt = new Date()
) => {
  const lines: ExportLine[] = [];
  const actions = session.actions || [];
  const sortedThemes = [...(session.themes || [])].sort((a, b) => b.votes - a.votes);

  lines.push({ text: `Retro session ${session.id}`, size: 22 });
  const createdAt = formatOptionalDateTime(session.createdAt);
  if (createdAt) {
    lines.push({ text: `Created ${createdAt}`, size: 10, gapBefore: 4 });
  }
  lines.push({ text: `Exported ${formatDateTime(exportedAt)}`, size: 10, gapBefore: 4 });
  lines.push({ text: `Phase: ${session.phase}`, size: 11, gapBefore: 12 });
  lines.push({ text: `Cards: ${session.tickets.length} | Themes: ${session.themes.length} | Actions: ${actions.length}`, size: 11 });

  addSection(lines, 'Cards by Column');
  Object.values(ColumnType).forEach((column: ColumnType) => {
    const tickets = session.tickets.filter(ticket => ticket.column === column);
    lines.push({ text: `${column} (${tickets.length})`, size: 13, gapBefore: 10 });

    if (tickets.length === 0) {
      lines.push({ text: 'No cards.', size: 10 });
      return;
    }

    tickets.forEach(ticket => {
      addWrapped(lines, `- ${ticket.text}`, 11, 5);
      addWrapped(lines, `  ${ticket.author || 'Anonymous'} | ${getTicketThemeName(session, ticket)}`, 9);
    });
  });

  addSection(lines, 'Themes');
  if (sortedThemes.length === 0) {
    lines.push({ text: 'No themes yet.', size: 10 });
  } else {
    sortedThemes.forEach(theme => {
      lines.push({ text: `${theme.name} (${theme.votes} vote${theme.votes === 1 ? '' : 's'})`, size: 13, gapBefore: 10 });
      addWrapped(lines, theme.description || 'No description.', 10);
      session.tickets
        .filter(ticket => ticket.themeId === theme.id)
        .forEach(ticket => addWrapped(lines, `- ${ticket.text}`, 10, 4));
    });
  }

  addSection(lines, 'Actions');
  if (actions.length === 0) {
    lines.push({ text: 'No actions captured.', size: 10 });
  } else {
    actions.forEach((action, index) => {
      addWrapped(lines, `${index + 1}. ${action.assigneeName || 'Unassigned'}: ${action.text}`, 11, index === 0 ? 0 : 5);
    });
  }

  return lines;
};

const toWinAnsiHex = (value: string) => {
  let hex = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const byte = (code >= 32 && code <= 126) || (code >= 160 && code <= 255) ? code : 63;
    hex += byte.toString(16).padStart(2, '0').toUpperCase();
  }
  return hex;
};

const hexToRgb = (value: string) => {
  const fallback = [15, 23, 42];
  const hex = value.trim().match(/^#?([a-f\d]{6})$/i)?.[1];
  if (!hex) return fallback;

  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
};

const colorCommand = (value: string, operator: 'rg' | 'RG') => {
  const [r, g, b] = hexToRgb(value).map(part => (part / 255).toFixed(3));
  return `${r} ${g} ${b} ${operator}`;
};

const textCommand = (
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  font = 'F1'
) => `${colorCommand(color, 'rg')} BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm <${toWinAnsiHex(text)}> Tj ET\n`;

const rectCommand = (
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke?: string,
  strokeWidth = 1
) => {
  const fillCommand = colorCommand(fill, 'rg');
  if (!stroke) {
    return `q ${fillCommand} ${x} ${y} ${width} ${height} re f Q\n`;
  }

  return `q ${fillCommand} ${colorCommand(stroke, 'RG')} ${strokeWidth} w ${x} ${y} ${width} ${height} re B Q\n`;
};

const pillWidth = (text: string, size: number) => Math.max(64, text.length * size * 0.6 + 24);

const getCssVar = (name: string, fallback: string) => {
  if (typeof window === 'undefined') return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const getCurrentPalette = (): PdfPalette => ({
  background: getCssVar('--color-background', DEFAULT_PALETTE.background),
  surface: getCssVar('--color-surface', DEFAULT_PALETTE.surface),
  primary: getCssVar('--color-primary', DEFAULT_PALETTE.primary),
  secondary: getCssVar('--color-secondary', DEFAULT_PALETTE.secondary),
  text: getCssVar('--color-text', DEFAULT_PALETTE.text),
  textMuted: getCssVar('--color-textMuted', DEFAULT_PALETTE.textMuted),
  border: getCssVar('--color-border', DEFAULT_PALETTE.border),
  ticketBackground: getCssVar('--color-ticketBackground', DEFAULT_PALETTE.ticketBackground),
  white: '#ffffff'
});

class PdfCanvas {
  private pages: string[] = [];
  private currentPage = '';
  private y = PAGE_HEIGHT - MARGIN;
  private pageNumber = 0;

  constructor(private palette: PdfPalette) {
    this.newPage();
  }

  get cursorY() {
    return this.y;
  }

  private newPage() {
    if (this.currentPage) {
      this.pages.push(this.currentPage);
    }

    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN;
    this.currentPage = rectCommand(0, 0, PAGE_WIDTH, PAGE_HEIGHT, this.palette.background);
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) {
      this.newPage();
    }
  }

  gap(height: number) {
    this.ensure(height);
    this.y -= height;
  }

  text(text: string, x: number, y: number, size: number, color: string, font = 'F1') {
    this.currentPage += textCommand(text, x, y, size, color, font);
  }

  rect(x: number, y: number, width: number, height: number, fill: string, stroke?: string, strokeWidth = 1) {
    this.currentPage += rectCommand(x, y, width, height, fill, stroke, strokeWidth);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
    this.currentPage += `q ${colorCommand(color, 'RG')} ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q\n`;
  }

  heading(title: string) {
    this.ensure(44);
    this.gap(18);
    this.text(title.toUpperCase(), MARGIN, this.y, 13, this.palette.text, 'F2');
    this.line(MARGIN, this.y - 9, PAGE_WIDTH - MARGIN, this.y - 9, this.palette.border, 1);
    this.y -= 24;
  }

  stat(label: string, value: string, x: number, y: number, width: number) {
    this.rect(x, y, width, 52, this.palette.surface, this.palette.border);
    this.text(label.toUpperCase(), x + 12, y + 32, 8, this.palette.textMuted, 'F2');
    this.text(value, x + 12, y + 13, 16, this.palette.text, 'F2');
  }

  pill(text: string, x: number, y: number, fill: string, color: string, size = 9) {
    const width = pillWidth(text, size);
    this.rect(x, y, width, 20, fill, this.palette.border);
    this.text(text, x + 10, y + 7, size, color, 'F2');
    return width;
  }

  wrappedText(text: string, x: number, width: number, size: number, color: string, font = 'F1', lineHeight = Math.ceil(size * 1.35)) {
    const lines = wrapText(text, size, width);
    lines.forEach(line => {
      this.ensure(lineHeight);
      this.text(line, x, this.y, size, color, font);
      this.y -= lineHeight;
    });
  }

  card(title: string, meta: string, body: string, accent: string) {
    const bodyLines = wrapText(body, 10, CONTENT_WIDTH - 38);
    const metaLines = wrapText(meta, 8, CONTENT_WIDTH - 38);
    const height = 34 + bodyLines.length * 12 + metaLines.length * 9;

    this.ensure(height + 10);
    const top = this.y;
    const y = top - height;
    this.rect(MARGIN, y, CONTENT_WIDTH, height, this.palette.ticketBackground, this.palette.border);
    this.rect(MARGIN, y, 5, height, accent);
    this.text(title, MARGIN + 18, top - 15, 8, accent, 'F2');

    let textY = top - 29;
    bodyLines.forEach(line => {
      this.text(line, MARGIN + 18, textY, 10, this.palette.text);
      textY -= 12;
    });
    metaLines.forEach(line => {
      this.text(line, MARGIN + 18, textY, 8, this.palette.textMuted, 'F2');
      textY -= 9;
    });

    this.y = y - 16;
  }

  themeCard(title: string, description: string, votes: number, tickets: Ticket[]) {
    const descriptionLines = wrapText(description || 'No description.', 10, CONTENT_WIDTH - 28);
    const ticketLines = tickets.flatMap(ticket => wrapText(`- ${ticket.text}`, 9, CONTENT_WIDTH - 40));
    const height = 42 + descriptionLines.length * 12 + Math.max(ticketLines.length, 1) * 10;

    this.ensure(height + 12);
    const top = this.y;
    const y = top - height;
    this.rect(MARGIN, y, CONTENT_WIDTH, height, this.palette.surface, this.palette.border);
    this.text(title, MARGIN + 14, top - 19, 12, this.palette.text, 'F2');
    const voteText = `${votes} vote${votes === 1 ? '' : 's'}`;
    const voteWidth = pillWidth(voteText, 9);
    this.rect(PAGE_WIDTH - MARGIN - voteWidth - 12, top - 29, voteWidth, 18, this.palette.secondary, this.palette.border);
    this.text(voteText, PAGE_WIDTH - MARGIN - voteWidth - 2, top - 23, 9, this.palette.primary, 'F2');

    let textY = top - 38;
    descriptionLines.forEach(line => {
      this.text(line, MARGIN + 14, textY, 10, this.palette.textMuted);
      textY -= 12;
    });

    if (tickets.length === 0) {
      this.text('No linked cards.', MARGIN + 14, textY - 4, 9, this.palette.textMuted);
    } else {
      ticketLines.forEach(line => {
        this.text(line, MARGIN + 24, textY - 4, 9, this.palette.text);
        textY -= 10;
      });
    }

    this.y = y - 12;
  }

  finish() {
    if (this.currentPage) {
      this.pages.push(this.currentPage);
      this.currentPage = '';
    }
    return this.pages;
  }
}

const estimateCardHeight = (ticket: Ticket) => {
  const bodyLines = wrapText(ticket.text, 10, CONTENT_WIDTH - 38);
  const metaLines = wrapText(`${ticket.author || 'Anonymous'} | ${ticket.themeId || 'Ungrouped'}`, 8, CONTENT_WIDTH - 38);
  return 34 + bodyLines.length * 12 + metaLines.length * 9 + 16;
};

export const buildSessionPdf = (
  session: SessionState,
  participants: User[],
  exportedAt = new Date(),
  palette: PdfPalette = DEFAULT_PALETTE
) => {
  const canvas = new PdfCanvas(palette);
  const actions = session.actions || [];
  const sortedThemes = [...(session.themes || [])].sort((a, b) => b.votes - a.votes);

  canvas.rect(MARGIN, 724, CONTENT_WIDTH, 82, palette.primary);
  canvas.text('Retro', MARGIN + 20, 774, 24, palette.white, 'F2');
  canvas.text(`Session ${session.id}`, MARGIN + 20, 754, 10, palette.white, 'F2');
  const createdAt = formatOptionalDateTime(session.createdAt);
  canvas.text(createdAt ? `Created ${createdAt}` : `Exported ${formatDateTime(exportedAt)}`, MARGIN + 20, 740, 9, palette.white);
  if (createdAt) {
    canvas.text(`Exported ${formatDateTime(exportedAt)}`, MARGIN + 20, 727, 8, palette.white);
  }
  canvas.pill(session.phase, PAGE_WIDTH - MARGIN - pillWidth(session.phase, 10) - 20, 762, palette.white, palette.primary, 10);

  const statWidth = (CONTENT_WIDTH - 16) / 3;
  canvas.stat('Cards', String(session.tickets.length), MARGIN, 660, statWidth);
  canvas.stat('Themes', String(session.themes.length), MARGIN + statWidth + 8, 660, statWidth);
  canvas.stat('Actions', String(actions.length), MARGIN + (statWidth + 8) * 2, 660, statWidth);
  canvas.gap(142);

  canvas.heading('Cards by Column');
  Object.values(ColumnType).forEach((column: ColumnType) => {
    const tickets = session.tickets.filter(ticket => ticket.column === column);
    const accent = COLUMN_ACCENTS[column] || palette.primary;
    canvas.ensure(32 + (tickets[0] ? estimateCardHeight(tickets[0]) : 28));
    canvas.text(`${column} (${tickets.length})`, MARGIN, canvas.cursorY, 12, accent, 'F2');
    canvas.gap(18);

    if (tickets.length === 0) {
      canvas.wrappedText('No cards.', MARGIN, CONTENT_WIDTH, 10, palette.textMuted);
      canvas.gap(16);
      return;
    }

    tickets.forEach(ticket => {
      canvas.card(
        column,
        `${ticket.author || 'Anonymous'} | ${getTicketThemeName(session, ticket)}`,
        ticket.text,
        accent
      );
    });
  });

  canvas.heading('Themes');
  if (sortedThemes.length === 0) {
    canvas.wrappedText('No themes yet.', MARGIN, CONTENT_WIDTH, 10, palette.textMuted);
  } else {
    sortedThemes.forEach(theme => {
      canvas.themeCard(
        theme.name,
        theme.description,
        theme.votes,
        session.tickets.filter(ticket => ticket.themeId === theme.id)
      );
    });
  }

  canvas.heading('Actions');
  if (actions.length === 0) {
    canvas.wrappedText('No actions captured.', MARGIN, CONTENT_WIDTH, 10, palette.textMuted);
  } else {
    actions.forEach((action, index) => {
      canvas.card(
        `Action ${index + 1}`,
        `Assigned: ${action.assigneeName || 'Unassigned'}`,
        action.text,
        palette.primary
      );
    });
  }

  const pages = canvas.finish();

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const fontObject = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontObject = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pagesObjectId = addObject('');
  const pageObjectIds: number[] = [];

  pages.forEach(pageContent => {
    const contentObjectId = addObject(`<< /Length ${pageContent.length} >>\nstream\n${pageContent}endstream`);
    const pageObjectId = addObject(`<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObject} 0 R /F2 ${boldFontObject} 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
    pageObjectIds.push(pageObjectId);
  });

  const catalogObjectId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);
  objects[pagesObjectId - 1] = `<< /Type /Pages /Kids [${pageObjectIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
};

export const exportSessionToPdf = (session: SessionState, participants: User[]) => {
  const pdf = buildSessionPdf(session, participants, new Date(), getCurrentPalette());
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `retro-${sanitizeFilename(session.id)}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

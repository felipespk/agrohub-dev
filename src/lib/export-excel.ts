import ExcelJS from "exceljs";

export interface ExportColuna {
  header: string;
  key: string;
  width: number;
  tipo?: "texto" | "moeda" | "data" | "numero";
}

export interface ExportTotalizador {
  label: string;
  valor: string;
  positivo?: boolean;
}

export interface ExportConfig {
  nomeArquivo: string;
  titulo: string;
  subtitulo?: string;
  colunas: ExportColuna[];
  dados: Record<string, any>[];
  totalizadores?: ExportTotalizador[];
}

const VERDE_ESCURO = "FF1B4332";
const CINZA_CLARO = "FFF9FAFB";
const CINZA_BORDA = "FFE5E7EB";
const CINZA_TEXTO = "FF6B7280";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: CINZA_BORDA } },
  bottom: { style: "thin", color: { argb: CINZA_BORDA } },
  left: { style: "thin", color: { argb: CINZA_BORDA } },
  right: { style: "thin", color: { argb: CINZA_BORDA } },
};

export async function exportarExcel(config: ExportConfig) {
  const { nomeArquivo, titulo, subtitulo, colunas, dados, totalizadores } = config;
  const wb = new ExcelJS.Workbook();
  wb.creator = "AgroHub";
  wb.created = new Date();
  const ws = wb.addWorksheet(titulo.substring(0, 31));
  const colCount = colunas.length;
  const lastCol = colCount;

  // Row 1 — Title
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = titulo;
  titleCell.font = { bold: true, size: 16, color: { argb: VERDE_ESCURO } };
  titleCell.alignment = { vertical: "middle" };
  ws.getRow(1).height = 30;

  // Row 2 — Subtitle
  ws.mergeCells(2, 1, 2, lastCol);
  const subCell = ws.getCell(2, 1);
  subCell.value = subtitulo || `Gerado em ${new Date().toLocaleDateString("pt-BR")}`;
  subCell.font = { size: 11, color: { argb: CINZA_TEXTO } };
  ws.getRow(2).height = 20;

  // Row 3 — spacing
  ws.getRow(3).height = 8;

  // Row 4 — Header
  const headerRow = ws.getRow(4);
  colunas.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_ESCURO } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  });
  headerRow.height = 22;

  // Set column widths
  colunas.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  // Data rows
  dados.forEach((obj, rowIdx) => {
    const row = ws.getRow(5 + rowIdx);
    colunas.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      let val = obj[col.key];

      if (col.tipo === "moeda" && val != null) {
        cell.value = Number(val);
        cell.numFmt = '#,##0.00;-#,##0.00';
      } else if (col.tipo === "data" && val) {
        cell.value = typeof val === "string" ? val : val;
      } else if (col.tipo === "numero" && val != null) {
        cell.value = Number(val);
        cell.numFmt = "#,##0.00";
      } else {
        cell.value = val ?? "—";
      }

      cell.font = { size: 10 };
      cell.border = thinBorder;
      cell.alignment = { vertical: "middle" };
    });
    row.height = 18;

    // Zebra striping
    if (rowIdx % 2 === 1) {
      for (let c = 1; c <= colCount; c++) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: CINZA_CLARO } };
      }
    }
  });

  let nextRow = 5 + dados.length;

  // Totalizadores
  if (totalizadores && totalizadores.length > 0) {
    nextRow++; // blank row
    totalizadores.forEach((t) => {
      const row = ws.getRow(nextRow);
      if (colCount > 1) {
        ws.mergeCells(nextRow, 1, nextRow, colCount - 1);
      }
      const labelCell = row.getCell(1);
      labelCell.value = t.label;
      labelCell.font = { bold: true, size: 11 };
      labelCell.alignment = { horizontal: "right", vertical: "middle" };

      const valCell = row.getCell(colCount);
      valCell.value = t.valor;
      valCell.font = { bold: true, size: 11, color: { argb: t.positivo === false ? "FFDC2626" : "FF059669" } };
      valCell.alignment = { horizontal: "right", vertical: "middle" };
      row.height = 20;
      nextRow++;
    });
  }

  // Footer
  nextRow++;
  ws.mergeCells(nextRow, 1, nextRow, lastCol);
  const footerCell = ws.getCell(nextRow, 1);
  footerCell.value = `AgroHub — Gerado em ${new Date().toLocaleString("pt-BR")} — www.agrohub.com`;
  footerCell.font = { size: 9, color: { argb: CINZA_TEXTO }, italic: true };
  footerCell.alignment = { horizontal: "center", vertical: "middle" };

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

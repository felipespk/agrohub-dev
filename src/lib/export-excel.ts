/**
 * Professional Excel export using ExcelJS.
 * Colored headers, zebra rows, currency/date formatting, totals row.
 */
import ExcelJS from 'exceljs'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface ExcelColumn {
  key: string
  header: string
  width?: number
  type?: 'currency' | 'date' | 'number' | 'text'
}

export async function exportToExcel(
  filename: string,
  sheetName: string,
  columns: ExcelColumn[],
  rows: Record<string, unknown>[],
  totals?: Record<string, number>
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Agrix'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  })

  // Define columns
  sheet.columns = columns.map(col => ({
    key: col.key,
    width: col.width ?? 18,
  }))

  // Header row
  const headerRow = sheet.addRow(columns.map(c => c.header))
  headerRow.height = 28
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111110' },
    }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF78FC90' } },
    }
  })

  // Data rows (zebra striping)
  rows.forEach((row, idx) => {
    const dataRow = sheet.addRow(columns.map(col => {
      const val = row[col.key]
      if (col.type === 'date' && val) {
        return typeof val === 'string' ? new Date(val) : val
      }
      return val ?? ''
    }))

    const isEven = idx % 2 === 0
    dataRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1]
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } }
      }
      cell.alignment = { vertical: 'middle', horizontal: col?.type === 'currency' || col?.type === 'number' ? 'right' : 'left' }
      cell.font = { size: 10 }
      if (col?.type === 'currency') {
        cell.numFmt = 'R$ #,##0.00'
      } else if (col?.type === 'date') {
        cell.numFmt = 'DD/MM/YYYY'
      } else if (col?.type === 'number') {
        cell.numFmt = '#,##0.00'
      }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    })
  })

  // Totals row (if provided)
  if (totals) {
    const totalRow = sheet.addRow(
      columns.map(col => totals[col.key] !== undefined ? totals[col.key] : (col.key === columns[0].key ? 'TOTAL' : ''))
    )
    totalRow.height = 24
    totalRow.eachCell((cell, colNumber) => {
      const col = columns[colNumber - 1]
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      cell.font = { bold: true, size: 10 }
      cell.alignment = { vertical: 'middle', horizontal: col?.type === 'currency' ? 'right' : 'left' }
      if (col?.type === 'currency') cell.numFmt = 'R$ #,##0.00'
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF111110' } },
      }
    })
  }

  // Footer
  sheet.addRow([])
  const footerRow = sheet.addRow([
    `Agrix — Gestão Rural — Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
  ])
  footerRow.getCell(1).font = { italic: true, color: { argb: 'FF9CA3AF' }, size: 9 }
  sheet.mergeCells(footerRow.number, 1, footerRow.number, columns.length)

  // Download
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${format(new Date(), 'ddMMyyyy')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

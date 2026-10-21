// ============================================================================
// OCR (Tesseract.js) — usado apenas quando o PDF é escaneado (sem texto).
// O motor de OCR e o modelo de idioma (português) são baixados sob demanda;
// nenhum dado bancário sai do navegador.
// ============================================================================

// Import dinâmico para não pesar o bundle inicial.
type TesseractModule = typeof import('tesseract.js')

export async function ocrCanvases(
  canvases: HTMLCanvasElement[],
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const tesseract = (await import('tesseract.js')) as TesseractModule

  const worker = await tesseract.createWorker('por', 1, {
    logger: (m: { status?: string; progress?: number }) => {
      if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress?.(m.progress)
      }
    },
  })

  let text = ''
  for (const canvas of canvases) {
    const { data } = await worker.recognize(canvas)
    text += data.text + '\n'
  }

  await worker.terminate()
  return text
}

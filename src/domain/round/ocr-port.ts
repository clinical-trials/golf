export interface OcrCell {
  holeNumber: number
  field: 'strokes' | 'putts'
  value: number
  confidence: number
}

export interface OcrPort {
  readScorecard(storageKey: string): Promise<OcrCell[]>
}

/** Test double: returns exactly the cells it was constructed with. */
export class StubOcr implements OcrPort {
  constructor(private readonly cells: OcrCell[]) {}

  async readScorecard(_storageKey: string): Promise<OcrCell[]> {
    return this.cells
  }
}

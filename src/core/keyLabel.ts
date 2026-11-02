export function keyLabel(code: string): string {
  const letter = /^Key([A-Z])$/.exec(code);
  return letter ? letter[1] : code;
}

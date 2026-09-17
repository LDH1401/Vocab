/** Giá trị trần "đẹp" chia hết cho 2 để vạch giữa cũng là số nguyên */
export function niceMax(value: number): number {
  if (value <= 4) return 4
  const exp = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 4, 5, 6, 8, 10]) {
    const candidate = step * exp
    if (candidate >= value && candidate % 2 === 0) return candidate
  }
  return 10 * exp
}

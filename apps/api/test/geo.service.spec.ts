import { GeoService } from '../src/common/geo/geo.service'

describe('GeoService', () => {
  const geo = new GeoService()

  it('retorna 0 para pontos idênticos', () => {
    expect(geo.calculateDistanceMeters(0, 0, 0, 0)).toBe(0)
    expect(geo.calculateDistanceMeters(-23.5, -46.63, -23.5, -46.63)).toBe(0)
  })

  it('calcula ~111km para 1 grau de latitude', () => {
    const distance = geo.calculateDistanceMeters(0, 0, 1, 0)
    expect(distance).toBeGreaterThan(111_000)
    expect(distance).toBeLessThan(111_500)
  })

  it('calcula distância SP <-> Rio em ~357km', () => {
    const distance = geo.calculateDistanceMeters(
      -23.5505,
      -46.6333,
      -22.9068,
      -43.1729,
    )
    expect(distance).toBeGreaterThan(350_000)
    expect(distance).toBeLessThan(365_000)
  })

  it('valida raio (dentro e fora)', () => {
    expect(geo.isWithinRadius(50, 100)).toBe(true)
    expect(geo.isWithinRadius(100, 100)).toBe(true)
    expect(geo.isWithinRadius(101, 100)).toBe(false)
  })
})
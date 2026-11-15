import { describe, expect, it } from 'vitest'
import { bodyPlace } from './bodyPlace'

describe('bodyPlace', () => {
  it('names a skin region in plain words, with its side', () => {
    expect(bodyPlace('Posterior_region_of_leg_2', 0.1)).toBe('Calf (left)')
    expect(bodyPlace('Anterior_region_of_leg_1001', -0.1)).toBe('Shin (right)')
    expect(bodyPlace('Cubital_fossa', 0.3)).toBe('Inside of the elbow (left)')
    expect(bodyPlace('Dorsal_surfaces_of_digits_of_hand_1', -0.3)).toBe('Fingers (right)')
    expect(bodyPlace('Posterior_region_of_thigh', 0.08)).toBe('Back of the thigh (left)')
    expect(bodyPlace('Antihelixl', 0.11)).toBe('Ear (left)')
  })

  it('gives no side on the centre line', () => {
    expect(bodyPlace('Vertebral_region', 0.03)).toBe('Spine')
    expect(bodyPlace('Presternal_region', 0.005)).toBe('Chest')
    expect(bodyPlace('Nasal_region', -0.03)).toBe('Nose')
  })

  it('tells narrow regions from the wider ones that share a word', () => {
    expect(bodyPlace('Posterior_region_of_knee_3', 0.1)).toBe('Back of the knee (left)')
    expect(bodyPlace('Anterior_region_of_knee', 0.1)).toBe('Knee (left)')
    expect(bodyPlace('Posterior_region_of_neck', 0.03)).toBe('Back of the neck')
    expect(bodyPlace('Lateral_region_of_neck', 0.05)).toBe('Neck (left)')
    expect(bodyPlace('Interscapular_regionr', -0.05)).toBe('Upper back (right)')
    expect(bodyPlace('Mentolabial_sulcusl', 0.03)).toBe('Chin')
  })

  it('is not fooled by one region’s name inside another’s', () => {
    expect(bodyPlace('Pectoral_region_1001', -0.08)).toBe('Chest (right)')
    expect(bodyPlace('Oral_region', 0.03)).toBe('Mouth')
    expect(bodyPlace('Sternocleidomastoid_region', 0.05)).toBe('Neck (left)')
    expect(bodyPlace('Mastoid_regionr', -0.08)).toBe('Behind the ear (right)')
    expect(bodyPlace('Tubercle_of_upper_lipl', 0.01)).toBe('Mouth')
    expect(bodyPlace('Palmar_surfaces_of_digits_of_hand', 0.28)).toBe('Fingers (left)')
    expect(bodyPlace('Palm', 0.3)).toBe('Palm (left)')
    expect(bodyPlace('Plantar_surfaces_of_digits_of_foot', -0.1)).toBe('Toes (right)')
    expect(bodyPlace('Posterior_region_of_forearm', 0.3)).toBe('Forearm (left)')
    expect(bodyPlace('Anterior_region_of_arm', 0.2)).toBe('Upper arm (left)')
  })

  it('falls back to the region’s own name', () => {
    expect(bodyPlace('Some_new_region_2001', 0.1)).toBe('Some new region (left)')
    expect(bodyPlace('Odd_patchl', -0.1)).toBe('Odd patch (right)')
  })
})

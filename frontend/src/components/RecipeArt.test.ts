import { describe, expect, it } from 'vitest'
import { photoFor } from '@/components/RecipeArt'

describe('photoFor', () => {
  it('matches only dishes we have a photo of, most specific first', () => {
    expect(photoFor('Palak Paneer')).toBe('/img/palak-paneer.webp')
    expect(photoFor('Paneer Butter Masala')).toBe('/img/paneer-curry.webp')
    expect(photoFor('Veg Pulao')).toBe('/img/biryani.webp')
    expect(photoFor('Kanda Poha')).toBe('/img/poha.webp')
    expect(photoFor('Aloo Tikki')).toBe('/img/cutlets.webp')
    expect(photoFor('Paneer and Tomato Curry with Rice')).toBe('/img/paneer-curry.webp')
    expect(photoFor('Paneer Tomato Rice')).toBeNull()
    expect(photoFor('Egg Spinach Tomato Scramble')).toBeNull()
    expect(photoFor('Masala Omelette')).toBeNull()
    expect(photoFor('Pohari dal')).toBeNull()
  })
})

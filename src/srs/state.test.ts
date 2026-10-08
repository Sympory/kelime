import { State as FsrsState } from 'ts-fsrs'
import { describe, expect, it } from 'vitest'
import { State } from './state'

describe('State sabitleri', () => {
  it('ts-fsrs ile birebir aynı', () => {
    expect(State).toEqual({
      New: FsrsState.New,
      Learning: FsrsState.Learning,
      Review: FsrsState.Review,
      Relearning: FsrsState.Relearning,
    })
  })
})

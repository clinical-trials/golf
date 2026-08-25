import type { SkillDomain } from '@prisma/client'

export type ClubKind = 'DRIVER' | 'MID_IRON' | 'WEDGE' | 'PUTTER'
export type CameraAngle = 'FACE_ON' | 'DOWN_THE_LINE'

export interface ShotRequirement {
  id: string
  domain: SkillDomain
  club: ClubKind
  angle: CameraAngle
  swings: number
  guidance: string
}

const SWINGS_PER_SHOT = 3

export const COMBINE_PROTOCOL: readonly ShotRequirement[] = [
  {
    id: 'driver_face_on',
    domain: 'FULL_SWING',
    club: 'DRIVER',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'Camera at hip height, facing you square on, about ten feet away. Whole body and club in frame at the top.',
  },
  {
    id: 'driver_down_the_line',
    domain: 'FULL_SWING',
    club: 'DRIVER',
    angle: 'DOWN_THE_LINE',
    swings: SWINGS_PER_SHOT,
    guidance: 'Camera behind you on the target line, hip height, about ten feet back. Hands and target both in frame.',
  },
  {
    id: 'mid_iron_face_on',
    domain: 'FULL_SWING',
    club: 'MID_IRON',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'Same position as the driver face-on. Use a seven iron if you have one.',
  },
  {
    id: 'mid_iron_down_the_line',
    domain: 'FULL_SWING',
    club: 'MID_IRON',
    angle: 'DOWN_THE_LINE',
    swings: SWINGS_PER_SHOT,
    guidance: 'Same position as the driver down-the-line. Use a seven iron if you have one.',
  },
  {
    id: 'pitch_face_on',
    domain: 'SHORT_GAME',
    club: 'WEDGE',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'A pitch of roughly forty yards. Camera square on at hip height.',
  },
  {
    id: 'chip_face_on',
    domain: 'SHORT_GAME',
    club: 'WEDGE',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'A short chip from just off the green. Camera square on, low, close enough to see the strike.',
  },
  {
    id: 'putt_face_on',
    domain: 'PUTTING',
    club: 'PUTTER',
    angle: 'FACE_ON',
    swings: SWINGS_PER_SHOT,
    guidance: 'A ten foot putt. Camera square on at waist height, close enough to see the stroke.',
  },
  {
    id: 'putt_down_the_line',
    domain: 'PUTTING',
    club: 'PUTTER',
    angle: 'DOWN_THE_LINE',
    swings: SWINGS_PER_SHOT,
    guidance: 'Same putt from directly behind the ball, low, on the target line.',
  },
]

export function getRequirement(id: string): ShotRequirement | undefined {
  return COMBINE_PROTOCOL.find((r) => r.id === id)
}

// RSVP Core Engine - Main exports
// READ-001: RSVP Core Engine with Harness

// Components
export { RSVPReader } from "./RSVPReader"
export type { RSVPReaderProps } from "./RSVPReader"

export { WordDisplay } from "./WordDisplay"
export type { WordDisplayProps } from "./WordDisplay"

// Core functions
export { tokenizeWords } from "./tokenizer"
export type { WordToken } from "./tokenizer"

export { calculateORP } from "./orp"
export type { ORPPosition } from "./orp"

export { calculateWordDuration, createDefaultConfig } from "./timing"
export type { TimingConfig } from "./timing"

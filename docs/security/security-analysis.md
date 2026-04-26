# Security Analysis: RSVP Engine

**Date:** 2026-04-26  
**Component:** RSVP (Rapid Serial Visual Presentation) Engine  
**Scope:** `app/rsvp/` directory  
**Risk Level:** LOW (presentation-layer component with no network/external interactions)

---

## Executive Summary

The RSVP Engine is a React Native text display component that implements Rapid Serial Visual Presentation reading mode. It displays text one word at a time with optimal recognition point (ORP) highlighting.

**Overall Security Posture:** The RSVP Engine has a minimal attack surface. It is a pure presentation-layer component that:
- Processes only user-provided text content
- Has no network connectivity
- Has no persistence layer
- Has no authentication/authorization logic
- Does not execute dynamic code

---

## 1. Threat Model

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  User Input (text: string)                                  │
│       ↓                                                     │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  RSVPReader Component                                │  │
│  │  • tokenizeWords(text) → WordToken[]               │  │
│  │  • calculateWordDuration(word, config) → number    │  │
│  │  • calculateORP(word) → ORPPosition                │  │
│  │  • Reanimated animations                             │  │
│  │       ↓                                              │  │
│  │  WordDisplay Component                             │  │
│  │  • Renders word with ORP highlight                 │  │
│  └─────────────────────────────────────────────────────┘  │
│       ↓                                                     │
│  React Native UI (no network, no storage)                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Trust Boundaries

| Boundary | From | To | Risk Level |
|----------|------|-----|------------|
| Input Processing | User/App | RSVP Engine | LOW |
| Component Rendering | RSVP Engine | React Native | LOW |
| Animation System | RSVP Engine | react-native-reanimated | LOW |

### 1.3 Attack Surface

**Primary Entry Points:**
1. `RSVPReader` component `text` prop (string input)
2. `wpm` prop (number, affects timing)
3. `fontSize` prop (number, affects rendering)
4. `onComplete`, `onProgress`, `onWordChange` callbacks

**Attack Vectors Identified:**

| Vector | Severity | Description |
|--------|----------|-------------|
| Malicious text input | LOW | Injection attempts via text prop |
| ReDoS via tokenizer | LOW | Regex-based tokenization could be slow with crafted input |
| Animation DoS | LOW | Very long text could cause memory pressure |
| Callback exploitation | LOW | External callbacks could be abused if not validated |

---

## 2. Input Validation and Sanitization

### 2.1 Current State

#### Text Input (`tokenizer.ts`)
```typescript
export function tokenizeWords(text: string): WordToken[] {
  if (!text || !text.trim()) return []  // ✓ Null/empty check

  const tokens = text
    .split(/(\s+|[.,!?;:])/)  // ⚠ Regex splitting
    .filter((t) => t && !/^\s+$/.test(t))

  return tokens.map((text, index) => ({ text, index }))
}
```

**Findings:**
- ✅ Null/undefined input handled safely
- ✅ Empty string returns empty array
- ⚠️ No maximum length validation (could process extremely long strings)
- ⚠️ Regex could be slow with pathological input (ReDoS risk: LOW)

#### WPM Input (`timing.ts`)
```typescript
export function createDefaultConfig(baseWPM: number = 300): TimingConfig
```

**Findings:**
- ⚠️ No validation for negative, zero, or extremely high WPM values
- Very high WPM (e.g., 1,000,000) could cause timer issues

#### Word Display (`orp.ts`)
```typescript
export function calculateORP(word: string): ORPPosition {
  if (!word || word.length === 0) {
    return { index: 0, character: "" }
  }
  // ... calculation
}
```

**Findings:**
- ✅ Null/empty handling present
- ⚠️ No maximum word length validation

### 2.2 Recommendations

| Priority | Recommendation | Impact |
|----------|----------------|--------|
| MEDIUM | Add maximum text length limit (e.g., 100,000 characters) | Prevents memory exhaustion |
| MEDIUM | Validate WPM range (e.g., 50-2000 WPM) | Prevents timing anomalies |
| LOW | Add maximum word length check (e.g., 1000 chars) | Prevents rendering issues |
| LOW | Consider using a non-regex tokenizer for better performance | Reduces ReDoS risk |

---

## 3. Trust Boundaries Analysis

### 3.1 Component Trust Levels

| Component | Trust Level | Rationale |
|-----------|-------------|-----------|
| `tokenizeWords` | Trusted | Internal function, no external calls |
| `calculateORP` | Trusted | Pure computation, no side effects |
| `calculateWordDuration` | Trusted | Pure computation, no side effects |
| `RSVPReader` | Trusted | Controlled component lifecycle |
| `WordDisplay` | Trusted | Controlled rendering |

### 3.2 Data Flow Trust Analysis

```
Untrusted Input (text from user/content)
    ↓
[Input Validation Layer] ← RECOMMENDED ADDITION
    ↓
Trusted Processing (tokenization, timing calc)
    ↓
Trusted Output (React Native rendering)
```

---

## 4. Secrets Management

### 4.1 Current State

**No secrets are used by the RSVP Engine.**

The RSVP Engine is a pure UI component with:
- No API keys
- No authentication tokens
- No database connections
- No environment variable dependencies
- No configuration files

### 4.2 Recommendations

N/A - No secrets management required for this component.

---

## 5. Audit Logging

### 5.1 Current State

**No audit logging is implemented in the RSVP Engine.**

The component provides callback props that could be used for logging:
- `onComplete?: () => void`
- `onProgress?: (current: number, total: number) => void`
- `onWordChange?: (word: string, index: number) => void`

### 5.2 Recommendations

| Priority | Recommendation | Use Case |
|----------|----------------|----------|
| LOW | Document callback usage for telemetry | Parent components can implement logging |
| LOW | Add optional `onError` callback for error tracking | Better error visibility |

---

## 6. Dependency Vulnerabilities

### 6.1 Direct Dependencies

The RSVP Engine has minimal external dependencies:

| Dependency | Version | Purpose | Risk |
|------------|---------|---------|------|
| `react` | 19.2.0 | Core framework | LOW |
| `react-native` | 0.83.6 | Mobile framework | LOW |
| `react-native-reanimated` | 4.2.1 | Animations | LOW |

### 6.2 Dependency Analysis

**react-native-reanimated (4.2.1):**
- Used for smooth word transition animations
- Runs animation worklets on UI thread
- No known critical vulnerabilities
- No network access required

**Risk Assessment:** LOW
- All dependencies are widely-used, well-maintained libraries
- No dependencies with known critical CVEs in the versions used
- No dependencies that require network access or filesystem access

### 6.3 Recommendations

| Priority | Recommendation |
|----------|----------------|
| LOW | Enable automated dependency scanning (Dependabot/Snyk) |
| LOW | Pin dependency versions in package.json |

---

## 7. Specific Security Findings

### 7.1 Finding: No Input Length Limits

**Severity:** LOW  
**Location:** `tokenizer.ts`, `RSVPReader.tsx`

**Description:** The RSVP Engine does not enforce maximum input length limits. A malicious or accidental input of extremely large text (e.g., 10MB of text) could:
- Cause memory exhaustion
- Freeze the UI thread during tokenization
- Impact app performance

**Proof of Concept:**
```typescript
// Hypothetical attack
const maliciousText = "word ".repeat(10000000) // 80MB of text
<RSVPReader text={maliciousText} />
```

**Remediation:**
```typescript
// Add to tokenizer.ts
const MAX_TEXT_LENGTH = 100000 // ~100KB
const MAX_WORDS = 50000

export function tokenizeWords(text: string): WordToken[] {
  if (!text || !text.trim()) return []
  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`Text exceeds maximum length of ${MAX_TEXT_LENGTH}`)
    text = text.slice(0, MAX_TEXT_LENGTH)
  }
  // ... rest of implementation
}
```

### 7.2 Finding: WPM Range Not Validated

**Severity:** LOW  
**Location:** `timing.ts`

**Description:** The `createDefaultConfig` function accepts any number for WPM without validation. Extreme values could cause unexpected behavior:
- WPM = 0: Division by zero (would cause Infinity ms duration)
- Very high WPM: Could cause timer resolution issues

**Remediation:**
```typescript
const MIN_WPM = 50
const MAX_WPM = 2000

export function createDefaultConfig(baseWPM: number = 300): TimingConfig {
  const clampedWPM = Math.max(MIN_WPM, Math.min(MAX_WPM, baseWPM))
  return {
    baseWPM: clampedWPM,
    // ...
  }
}
```

### 7.3 Finding: Regex Tokenization Risk

**Severity:** LOW  
**Location:** `tokenizer.ts:28`

**Description:** The tokenizer uses a regex to split text:
```typescript
.split(/(\s+|[.,!?;:])/) 
```

While the current regex is simple and low-risk, regex-based parsing can be vulnerable to ReDoS with pathological input patterns.

**Remediation:**
Consider using a character-by-character tokenizer for large inputs or add a length check before regex processing.

---

## 8. Security Test Cases

Recommended security-focused test cases to add:

```typescript
describe("Security Tests", () => {
  it("should handle very long text gracefully", () => {
    const longText = "word ".repeat(100000)
    const tokens = tokenizeWords(longText)
    expect(tokens.length).toBeLessThanOrEqual(MAX_WORDS)
  })

  it("should handle zero WPM", () => {
    const config = createDefaultConfig(0)
    expect(config.baseWPM).toBeGreaterThan(0) // Should use minimum
  })

  it("should handle extreme WPM values", () => {
    const config = createDefaultConfig(1000000)
    expect(config.baseWPM).toBeLessThanOrEqual(MAX_WPM)
  })

  it("should sanitize or truncate special characters", () => {
    const text = "Hello\x00\x01\x02World" // Control characters
    const tokens = tokenizeWords(text)
    // Should not crash, should handle gracefully
    expect(tokens).toBeDefined()
  })
})
```

---

## 9. Compliance Considerations

### 9.1 Data Privacy

The RSVP Engine:
- Does not collect user data
- Does not transmit data over network
- Does not persist data to storage
- Only processes text temporarily for display

**GDPR/CCPA:** Not applicable - no personal data processing.

### 9.2 Accessibility

The component includes basic accessibility props:
- `accessibilityLabel` on pause/play button
- `accessibilityRole` definitions

---

## 10. Summary and Recommendations

### 10.1 Risk Summary

| Category | Risk Level | Notes |
|----------|------------|-------|
| Input Validation | LOW | Add length limits |
| Data Exposure | NONE | No data persistence |
| Network Security | NONE | No network access |
| Dependency Risk | LOW | Well-maintained deps |
| Side-channel Risk | NONE | No sensitive operations |

### 10.2 Action Items

| Priority | Action | Owner | Timeline |
|----------|--------|-------|----------|
| MEDIUM | Add MAX_TEXT_LENGTH constant and validation | Engineering | Sprint |
| MEDIUM | Add WPM range validation (MIN_WPM, MAX_WPM) | Engineering | Sprint |
| LOW | Add security test cases to test suite | Engineering | Backlog |
| LOW | Document security considerations in README | Documentation | Backlog |
| LOW | Set up automated dependency scanning | DevOps | Backlog |

### 10.3 Conclusion

The RSVP Engine is a low-risk component with a minimal attack surface. The primary security considerations are:

1. **Input validation** - Adding length limits will prevent potential DoS via resource exhaustion
2. **Bounds checking** - Validating WPM and timing parameters will ensure predictable behavior
3. **Testing** - Security-focused test cases will catch regressions

Overall, the RSVP Engine follows security best practices for a presentation-layer component and does not introduce significant security risks to the application.

---

## Appendix A: File Inventory

| File | Purpose | Lines | External Dependencies |
|------|---------|-------|----------------------|
| `index.ts` | Public API exports | 19 | None |
| `RSVPReader.tsx` | Main component | 241 | react, react-native, reanimated |
| `WordDisplay.tsx` | Word rendering | 88 | react, react-native |
| `tokenizer.ts` | Text tokenization | 32 | None |
| `orp.ts` | ORP calculation | 43 | None |
| `timing.ts` | Timing calculation | 96 | None |

**Total RSVP Engine Code:** ~519 lines (excluding tests)

---

## Appendix B: References

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security](https://reactnative.dev/docs/security)
- [CWE-20: Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)

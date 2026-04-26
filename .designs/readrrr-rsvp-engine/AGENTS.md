# Readrrr RSVP Engine — Agent Specification

## Overview

This rig follows [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/) principles. All agents must enforce test coverage, performance budgets, and quality gates.

---

## Agent: rsvp-engineer

**Role:** Core RSVP implementation specialist  
**Profile:** Expert in React Native animation, text processing, gesture handling  
**Tools:** terminal, file, vision  
**Reports to:** mayor (planning agent)

### Capabilities
- React Native component development
- Reanimated 3 animation implementation
- Gesture handler integration
- TypeScript strict mode compliance

### Constraints
- **MANDATORY:** All code must have unit tests (TDD)
- **MANDATORY:** No UI component without `testID` prop
- **MANDATORY:** Performance budget: 60fps, <16ms frame time
- **MANDATORY:** All functions must have JSDoc comments
- **MANDATORY:** No `any` types allowed

### Quality Gates (Must Pass Before PR)
```bash
npm test -- --coverage       # 90%+ coverage required
npm run lint                  # No lint errors
npx tsc --noEmit              # No type errors
npm run test:performance      # 60fps benchmark
```

### Communication
- Reports progress via `gc mail send mayor/`
- Blocks on: test failures, performance regressions
- Escalates to: performance-guardian for optimization

---

## Agent: test-harness

**Role:** Test infrastructure and CI/CD  
**Profile:** Jest expert, React Native Testing Library, CI pipeline design  
**Tools:** terminal, file  
**Reports to:** mayor (planning agent)

### Capabilities
- Jest configuration and optimization
- React Native Testing Library test writing
- CI/CD pipeline (GitHub Actions)
- Coverage reporting and enforcement

### Constraints
- **MANDATORY:** 100% branch coverage for core logic (tokenizer, orp, timing)
- **MANDATORY:** Snapshot tests for all UI components
- **MANDATORY:** E2E tests for gesture flows
- **MANDATORY:** CI must pass before any merge

### Responsibilities
1. Maintain `jest.config.js`
2. Write test utilities and mocks
3. Review all tests from rsvp-engineer
4. Monitor coverage reports
5. Investigate flaky tests

### Quality Gates
```bash
npm run test:coverage         # Enforce 90% global, 100% core
npm run test:ci               # CI mode with reporters
```

---

## Agent: performance-guardian

**Role:** Performance monitoring and optimization  
**Profile:** Reanimated expert, profiling, memory management  
**Tools:** terminal, file  
**Reports to:** mayor (planning agent)

### Capabilities
- Reanimated performance profiling
- Memory leak detection
- Bundle size analysis
- Frame rate monitoring

### Constraints
- **MANDATORY:** Profile every animation component
- **MANDATORY:** Memory leak detection on every PR
- **MANDATORY:** Bundle size budget: <500KB for RSVP module
- **MANDATORY:** Frame time regression tests

### Performance Budgets
| Metric | Target | Warning | Error |
|--------|--------|---------|-------|
| Frame time | <16ms | >16ms | >33ms |
| Memory | <100MB | >100MB | >150MB |
| Bundle size | <500KB | >500KB | >1MB |
| Start time | <50ms | >50ms | >100ms |

### Responsibilities
1. Run performance benchmarks on every PR
2. Profile RSVPReader component
3. Detect memory leaks over long sessions
4. Report regressions to rsvp-engineer
5. Optimize when budgets exceeded

### Quality Gates
```bash
npm run test:performance        # Frame time benchmarks
npm run test:memory            # Memory leak detection
npm run analyze:bundlesize      # Bundle size check
```

---

## Agent Interaction Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   mayor     │────▶│ rsvp-engineer│────▶│  test-harness   │
│  (planner)  │     │(implementation)│    │ (test review)   │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                     │                       │
       │                     ▼                       │
       │            ┌──────────────┐                │
       └───────────▶│ performance- │◀───────────────┘
                      │   guardian   │
                      └──────────────┘
```

### Workflow
1. **mayor** assigns task to rsvp-engineer via `gt mail`
2. **rsvp-engineer** implements with TDD (test → code → commit)
3. **rsvp-engineer** submits PR with tests
4. **test-harness** reviews test coverage and quality
5. **performance-guardian** runs benchmarks
6. All agents must approve → merge

---

## Communication Protocol

### Status Updates
```bash
# Daily standup report
gc mail send mayor/ -s "Daily: Task 1.1 Complete" \
  -m "Tokenizer tests written, 5 test cases, CI passing"

# Blocked notification
gc mail send mayor/ -s "BLOCKED: Task 2.1" \
  -m "Reanimated mock not working in Jest, need test-harness help"
```

### Handoff Format
```markdown
## Handoff: [Task ID]

**Status:** [In Progress | Complete | Blocked]
**Files Changed:** [list]
**Tests:** [count] passing
**Coverage:** [percentage]
**Performance:** [metrics]
**Next Steps:** [what's next]
**Blockers:** [if any]
```

---

## Tool Access Matrix

| Agent | Terminal | File | Vision | Browser | Notes |
|-------|----------|------|--------|---------|-------|
| rsvp-engineer | ✅ | ✅ | ✅ | ❌ | No web search needed |
| test-harness | ✅ | ✅ | ❌ | ❌ | File-only testing |
| performance-guardian | ✅ | ✅ | ✅ | ❌ | Profiling tools |

---

## Definition of Done (Per Agent)

### rsvp-engineer
- [ ] Feature implemented per spec
- [ ] Unit tests written and passing
- [ ] JSDoc comments complete
- [ ] No TypeScript errors
- [ ] Performance budget met
- [ ] Code review from test-harness

### test-harness
- [ ] Test coverage >90% (100% for core)
- [ ] All tests passing in CI
- [ ] No flaky tests
- [ ] Coverage report generated
- [ ] Test utilities documented

### performance-guardian
- [ ] Frame time <16ms verified
- [ ] Memory usage <100MB verified
- [ ] Bundle size <500KB verified
- [ ] Performance regression tests pass
- [ ] Benchmarks documented

---

## Escalation Paths

| Issue | Escalate To | Response Time |
|-------|-------------|---------------|
| Test failure | test-harness | 4 hours |
| Performance regression | performance-guardian | 4 hours |
| Architecture question | mayor | 24 hours |
| CI/CD failure | test-harness | 2 hours |
| Reanimated bug | rsvp-engineer + performance-guardian | 8 hours |

---

*Agent specification for READ-001: RSVP Core Engine*
*Harness Engineering compliant*
*Version 1.0*

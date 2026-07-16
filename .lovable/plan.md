## Problem

In `src/lib/simulationEngine.ts` (clock case, lines ~381–390), the current logic is:

```ts
const t = (time + phase) % period;
const highFirst = t < period * duty ? 1 : 0;
return startValue === 1 ? (highFirst === 1 ? 0 : 1) : highFirst;
```

At `t=0` with `startValue=0`, `highFirst` evaluates to `1`, so the clock is HIGH at time zero even though the user selected "Start Low (0)". The semantics are inverted: `highFirst` describes a clock that starts high, but it is returned as-is for `startValue=0`.

## Fix

Invert the mapping so `startValue` refers to the actual level at `t=0`:

- `startValue = 0` → clock is LOW for the first `duty*period`, then HIGH → outputs `0` at `t=0`.
- `startValue = 1` → clock is HIGH for the first `duty*period`, then LOW → outputs `1` at `t=0`.

New logic:

```ts
const t = ((time + phase) % period + period) % period; // safe modulo
const inFirstHalf = t < period * duty;
if (startValue === 1) return inFirstHalf ? 1 : 0;
return inFirstHalf ? 0 : 1;
```

Also normalize the modulo so negative `phase` values don't produce a negative `t`.

## Scope

- Edit only the `clock` branch in `src/lib/simulationEngine.ts`.
- Update the existing D flip-flop test (`src/test/flipflop.test.ts`) if needed: it currently assumes rising edges at `t=0, 10, 20` with the default clock (no `startValue`, defaulting to 0). With the fix, the default clock will now start LOW, so rising edges will occur at `t = duty*period = 5, 15, 25`. Adjust either the test's `startValue` (set to `1`) or its expected edge times so the test continues to validate flip-flop behavior.

## Out of scope

No UI, type, or default-value changes — the PropertiesPanel dropdown and `useCircuit` defaults already pass `startValue: 0` correctly.

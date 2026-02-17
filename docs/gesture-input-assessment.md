# Gesture Input Assessment: Eye & Voice Activation

## What We're Evaluating

Adding **voice commands** and **eye tracking** as optional input methods alongside keyboard controls in the Input Demo. These would be additive — the keyboard always works, and gesture inputs layer on top for users who opt in.

---

## The Short Version

Voice commands are realistic and map well to the demo. Eye tracking is significantly harder and less reliable. Both require the user's explicit permission (microphone, camera) and clear visual feedback so people know the system is listening/watching.

The existing architecture supports this cleanly — the input system doesn't care *where* a command comes from, only *what* the command is. Adding new input sources doesn't require rebuilding what's already there.

---

## Voice Commands

### How It Works

The user enables voice input via a toggle. The browser asks for microphone permission. Once granted, the system listens for short spoken commands like "jump", "fire", "block", or "dash" and treats them the same as pressing the corresponding key.

### What's Realistic

| Aspect | Reality |
|--------|---------|
| **Accuracy** | Good for short, distinct commands (single words). Poor for similar-sounding words or noisy environments. |
| **Speed** | ~150ms delay between speaking and the action firing. Noticeable but usable for a demo. Not fast enough for competitive gameplay. |
| **Browser support** | Chrome works well. Safari and Firefox have limited or no support for the browser's built-in speech recognition. |
| **"Key release" problem** | A keyboard naturally detects when you let go of a key. Voice has no equivalent — when you say "jump", there's no natural "stop jumping" signal. We'd need to auto-release after a short delay (~200ms), which feels different from holding a key down. |

### Effort Level

**Medium.** The browser provides speech recognition out of the box (no server needed for a demo). The main work is building the opt-in flow, visual feedback ("listening..." indicator), and mapping voice commands to actions in the settings panel.

---

## Eye Tracking

### How It Works

The user enables eye tracking via a toggle. The browser asks for camera permission. A library processes the webcam feed to detect where the user is looking or when they blink, and maps those gestures to actions.

### What's Realistic

| Aspect | Reality |
|--------|---------|
| **Accuracy** | Low to moderate. Works in controlled lighting with a stable head position. Degrades quickly with glasses, different skin tones, varied lighting, or head movement. |
| **Calibration** | Required before use. The user must follow a dot around the screen for 10-30 seconds. Calibration drifts over time and needs to be redone. |
| **What it can detect reliably** | Blinks (best), general gaze direction (left/right/center — moderate), specific screen targets (poor without expensive hardware). |
| **What it can't do well** | Distinguish intentional blinks from natural ones. Detect subtle gestures like squinting. Track precise gaze position accurately enough for small UI targets. |
| **The mapping problem** | The demo has 4 discrete actions (jump, attack, defend, dash). Eyes don't naturally produce 4 distinct, reliable signals. Realistically, blink = 1 action, gaze left/right = 2 more actions. That's 3 at best, and each one has false positive issues. |

### Effort Level

**High.** Requires a third-party library, calibration flow, confidence thresholds to filter false positives, and significant UX work to make it feel reliable rather than frustrating. The gap between "technically working" and "actually usable" is large.

---

## Side-by-Side Comparison

| Factor | Voice | Eye Tracking |
|--------|-------|-------------|
| User effort to activate | Tap a button, grant mic access | Tap a button, grant camera access, complete calibration |
| Reliability | Good (quiet environment, clear words) | Low-moderate (controlled conditions only) |
| Number of actions it supports | 4+ distinct commands easily | 1-3 gestures realistically |
| "Wow factor" for demo | High — people enjoy talking to interfaces | Very high — but often followed by frustration |
| Risk of feeling broken | Low if we set confidence thresholds | High — false positives and calibration drift |
| Privacy perception | Moderate — microphone access | High — camera access feels more invasive |
| Works on mobile | Partially (speech recognition varies) | No (webcam-based, desktop only) |

---

## Options

### Option A: Voice Only

Add voice commands as an optional input method. Skip eye tracking entirely.

- **What the user sees:** A "voice" toggle in the settings. When enabled, they can say commands ("jump", "fire") and see the same action indicators light up as when pressing keys.
- **Why this makes sense:** Voice maps naturally to the demo's discrete actions. It's reliable enough to feel good in a demo. It demonstrates the multi-input architecture pattern without the frustration of unreliable eye tracking.
- **Effort:** Medium
- **Risk:** Low

### Option B: Voice + Simplified Eye (Blink Only)

Add voice commands plus blink detection mapped to a single action.

- **What the user sees:** Voice toggle + eye toggle. Eye tracking only detects blinks, mapped to one action (e.g., "defend"). A calibration step is required.
- **Why this makes sense:** Shows the full multi-modal vision without over-promising on eye tracking accuracy. Blink is the most reliable eye gesture.
- **Effort:** High
- **Risk:** Medium — blink detection still has false positives

### Option C: Voice + Full Eye Tracking

Add voice commands plus gaze direction and blink detection mapped to multiple actions.

- **What the user sees:** Full gesture suite. Voice commands for all actions, plus eye gaze (look left = dash, look right = attack, blink = defend).
- **Why this is risky:** Gaze direction accuracy is poor without expensive hardware. Users will experience phantom activations, calibration drift, and frustration. The demo may feel impressive for 30 seconds and broken after 2 minutes.
- **Effort:** Very high
- **Risk:** High — likely to underwhelm after initial novelty

### Option D: Mock/Simulated Gestures

Build the full UI and settings for voice + eye, but use simulated inputs instead of real recognition. Buttons labeled "simulate voice: jump" and "simulate blink" demonstrate the architecture and UX without depending on AI accuracy.

- **What the user sees:** The complete multi-input settings panel and visual feedback, with manual trigger buttons standing in for real recognition. Real recognition can be swapped in later.
- **Why this makes sense:** Demonstrates the architecture pattern, the settings UX, and the Rive integration without any AI risk. Ships fast, looks complete.
- **Effort:** Low-medium
- **Risk:** Very low

---

## Recommendation

**Start with Option A (voice only) or Option D (simulated) depending on timeline.**

If the goal is a polished demo that actually works: **Option A**. Voice commands are reliable, impressive, and map naturally to the existing design. Eye tracking can be added later if there's demand.

If the goal is to show the full vision quickly without accuracy risk: **Option D**. Build the complete UI for all input types, simulate the inputs, and swap in real recognition when ready.

Either way, the underlying architecture supports all options — the decision is about scope and polish, not technical feasibility.

---

## Questions for Discussion

1. **Who is the audience for this demo?** If it's developers learning the pattern, Option D is fine. If it's end users who need to be impressed, Option A.
2. **What's the timeline?** Voice (Option A) adds roughly a sprint of work. Full eye tracking (Option C) could take 2-3x that with uncertain results.
3. **Is cross-browser support important?** Voice recognition via browser APIs works best in Chrome. If Safari/Firefox matter, we'd need a server-side solution which adds backend infrastructure.
4. **How important is mobile?** Voice works on mobile (partially). Eye tracking does not.

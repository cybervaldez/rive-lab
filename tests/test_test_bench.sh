#!/bin/bash
# tests/test_test_bench.sh — Verify TestBench component exercises full XState ↔ Rive contract
set +e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/test_utils.sh"

BASE_URL="${BASE_URL:-http://localhost:5174}"
setup_cleanup
print_header "TestBench Component Tests"

if ! wait_for_server "$BASE_URL"; then
    fail "Server not running on $BASE_URL"
    print_summary
fi

# ============================================================================
# PHASE 1: Page renders with all controls
# ============================================================================
echo ""
echo "--- PHASE 1: Page renders ---"

agent-browser open "$BASE_URL/test/test-bench" 2>/dev/null
sleep 3

# 1. Demo renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"demo-test-bench\"]') !== null")
[ "$VALUE" = "true" ] && pass "TestBench demo renders" || fail "TestBench demo missing"

# 2. Readout section
VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-readout\"]') !== null")
[ "$VALUE" = "true" ] && pass "Readout section renders" || fail "Readout section missing"

# 3. Initial state is idle
VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "Initial state is idle" || fail "Expected idle, got: $VALUE"

# 4. Progress starts at 0
VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-progress\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "Initial progress is 0" || fail "Expected 0, got: $VALUE"

# 5. Trigger buttons render
VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-activate\"]') !== null")
[ "$VALUE" = "true" ] && pass "Activate button present" || fail "Activate button missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-complete\"]') !== null")
[ "$VALUE" = "true" ] && pass "Complete button present" || fail "Complete button missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-reset\"]') !== null")
[ "$VALUE" = "true" ] && pass "Reset button present" || fail "Reset button missing"

# 6. Complete button disabled in idle
VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-complete\"]')?.disabled")
[ "$VALUE" = "true" ] && pass "Complete button disabled in idle" || fail "Complete should be disabled in idle"

# 7. Range sliders render
VALUE=$(browser_eval "document.querySelector('[data-testid=\"range-progress\"]') !== null")
[ "$VALUE" = "true" ] && pass "Progress range slider present" || fail "Progress range missing"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"range-slider\"]') !== null")
[ "$VALUE" = "true" ] && pass "Target→Source slider present" || fail "Target→Source slider missing"

# 8. Rive Event button renders
VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-rive-event\"]') !== null")
[ "$VALUE" = "true" ] && pass "Rive Event button present" || fail "Rive Event button missing"

# 9. Topbar shows test bench
VALUE=$(browser_eval "document.querySelector('[data-testid=\"topbar-name\"]')?.textContent")
echo "$VALUE" | grep -qi "TEST BENCH" && pass "Topbar shows TEST BENCH" || fail "Topbar: $VALUE"

# 10. Sidebar shows test-bench entry
VALUE=$(browser_eval "document.querySelector('[data-testid=\"entry-test-bench\"]') !== null")
[ "$VALUE" = "true" ] && pass "Sidebar entry for test-bench" || fail "Sidebar entry missing"

# ============================================================================
# PHASE 2: State transitions + property updates
# ============================================================================
echo ""
echo "--- PHASE 2: State transitions ---"

# 11. Activate → state=active, isActive=true, mode=active
browser_eval "document.querySelector('[data-testid=\"btn-activate\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-state\"]')?.textContent")
[ "$VALUE" = "active" ] && pass "activate → state=active" || fail "Expected active, got: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-active\"]')?.textContent")
[ "$VALUE" = "true" ] && pass "activate → isActive=true" || fail "Expected true, got: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-mode\"]')?.textContent")
[ "$VALUE" = "active" ] && pass "activate → mode=active" || fail "Expected active, got: $VALUE"

# 12. Complete button enabled in active state
VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-complete\"]')?.disabled")
[ "$VALUE" = "false" ] && pass "Complete button enabled in active" || fail "Complete should be enabled in active"

# 13. Activate button disabled in active state
VALUE=$(browser_eval "document.querySelector('[data-testid=\"btn-activate\"]')?.disabled")
[ "$VALUE" = "true" ] && pass "Activate button disabled in active" || fail "Activate should be disabled in active"

# 14. SET_LABEL updates label
browser_eval "
  const input = document.querySelector('[data-testid=\"input-label\"]');
  const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSet.call(input, 'hello rive');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('[data-testid=\"btn-set-label\"]')?.click();
" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-label\"]')?.textContent")
[ "$VALUE" = "hello rive" ] && pass "SET_LABEL updates label to 'hello rive'" || fail "Label: $VALUE"

# 15. RIVE_COMPLETE increments event counter
browser_eval "document.querySelector('[data-testid=\"btn-rive-event\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-events\"]')?.textContent")
[ "$VALUE" = "1" ] && pass "RIVE_COMPLETE → riveEventCount=1" || fail "Expected 1, got: $VALUE"

# 16. Second RIVE_COMPLETE increments again
browser_eval "document.querySelector('[data-testid=\"btn-rive-event\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-events\"]')?.textContent")
[ "$VALUE" = "2" ] && pass "Second RIVE_COMPLETE → riveEventCount=2" || fail "Expected 2, got: $VALUE"

# 17. Complete → state=complete, progress=100
browser_eval "document.querySelector('[data-testid=\"btn-complete\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-state\"]')?.textContent")
[ "$VALUE" = "complete" ] && pass "complete → state=complete" || fail "Expected complete, got: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-progress\"]')?.textContent")
[ "$VALUE" = "100" ] && pass "complete → progress=100" || fail "Expected 100, got: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-mode\"]')?.textContent")
[ "$VALUE" = "complete" ] && pass "complete → mode=complete" || fail "Expected complete, got: $VALUE"

# 18. Reset → everything clears
browser_eval "document.querySelector('[data-testid=\"btn-reset\"]')?.click()" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-state\"]')?.textContent")
[ "$VALUE" = "idle" ] && pass "reset → state=idle" || fail "Expected idle, got: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-progress\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "reset → progress=0" || fail "Expected 0, got: $VALUE"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-events\"]')?.textContent")
[ "$VALUE" = "0" ] && pass "reset → riveEventCount=0" || fail "Expected 0, got: $VALUE"

# ============================================================================
# PHASE 3: Target→Source simulation
# ============================================================================
echo ""
echo "--- PHASE 3: Target→Source simulation ---"

# 19. Activate first (SLIDER_CHANGED only handled in active state)
browser_eval "document.querySelector('[data-testid=\"btn-activate\"]')?.click()" > /dev/null
sleep 0.3

# 20. Slider change updates sliderValue
browser_eval "
  const slider = document.querySelector('[data-testid=\"range-slider\"]');
  const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  nativeSet.call(slider, '42');
  slider.dispatchEvent(new Event('input', { bubbles: true }));
  slider.dispatchEvent(new Event('change', { bubbles: true }));
" > /dev/null
sleep 0.3

VALUE=$(browser_eval "document.querySelector('[data-testid=\"bench-slider\"]')?.textContent")
[ "$VALUE" = "42" ] && pass "Slider → sliderValue=42 (Target→Source)" || fail "Expected 42, got: $VALUE"

# Reset for next phase
browser_eval "document.querySelector('[data-testid=\"btn-reset\"]')?.click()" > /dev/null
sleep 0.3

# ============================================================================
# PHASE 4: Debug panel integration
# ============================================================================
echo ""
echo "--- PHASE 4: Debug panel ---"

# 20. Debug panel opens via footer bar
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opens" || fail "Debug panel missing"

# 21. Context inspector renders (default tab)
VALUE=$(browser_eval "document.querySelector('[data-testid=\"context-inspector\"]') !== null")
[ "$VALUE" = "true" ] && pass "Context inspector renders (default tab)" || fail "Context inspector missing"

# 22. StateGraph renders on State tab
browser_eval "document.querySelector('[data-testid=\"debug-tab-state\"]')?.click()" > /dev/null
sleep 0.3
VALUE=$(browser_eval "document.querySelector('[data-testid=\"state-graph\"]') !== null")
[ "$VALUE" = "true" ] && pass "StateGraph renders on State tab" || fail "StateGraph missing"

# 23. Event log renders on Events tab
browser_eval "document.querySelector('[data-testid=\"debug-tab-events\"]')?.click()" > /dev/null
sleep 0.3
VALUE=$(browser_eval "document.querySelector('[data-testid=\"event-log\"]') !== null")
[ "$VALUE" = "true" ] && pass "Event log renders on Events tab" || fail "Event log missing"

# 24. window.__xstate__ exposed
VALUE=$(browser_eval "typeof window.__xstate__?.TestBenchSM")
[ "$VALUE" = "object" ] && pass "window.__xstate__.TestBenchSM exposed" || fail "XState debug missing: $VALUE"

# Close debug panel before Phase 5
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.3

# ============================================================================
# PHASE 5: Instructions panel + test wizard
# ============================================================================
echo ""
echo "--- PHASE 5: Instructions + Test wizard ---"

# 25. Switch to instructions
browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"recipe-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "RecipePanel renders" || fail "RecipePanel missing"

# 26. Steps tab has 10 instruct steps
VALUE=$(browser_eval "document.querySelectorAll('.instruct-step').length")
[ "$VALUE" = "10" ] && pass "10 instruct steps rendered" || fail "Expected 10 steps, got: $VALUE"

# 27. Reference tab shows machine doc
browser_eval "document.querySelector('[data-testid=\"recipe-tab-reference\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"section-meta\"]') !== null")
[ "$VALUE" = "true" ] && pass "Reference tab shows machine doc" || fail "Machine doc missing"

# 28. Back to steps, open test wizard
browser_eval "document.querySelector('[data-testid=\"recipe-tab-steps\"]')?.click()" > /dev/null
sleep 0.3
browser_eval "document.querySelector('[data-testid=\"instruct-test-btn\"]')?.click()" > /dev/null
sleep 0.5

VALUE=$(browser_eval "document.querySelector('[data-testid=\"test-wizard\"]') !== null")
[ "$VALUE" = "true" ] && pass "Test wizard opens" || fail "Test wizard missing"

# 29. Test wizard shows verify key results
VALUE=$(browser_eval "document.querySelector('[data-testid=\"test-wizard-summary\"]')?.textContent")
echo "$VALUE" | grep -qE "[0-9]+/[0-9]+ passed" && pass "Test wizard shows pass summary: $VALUE" || fail "Summary format: $VALUE"

# 30. Navigate to step 7 (Triggers) which has event-driven checks
for i in 1 2 3 4 5 6; do
    browser_eval "document.querySelector('[data-testid=\"test-wizard-next\"]')?.click()" > /dev/null
    sleep 0.2
done

VALUE=$(browser_eval "document.querySelector('[data-testid=\"test-wizard-events\"]') !== null")
[ "$VALUE" = "true" ] && pass "Step 7 has event-driven checks" || fail "Event-driven checks missing"

# 31. Run event checks
browser_eval "document.querySelector('[data-testid=\"test-wizard-run-events\"]')?.click()" > /dev/null
sleep 1

VALUE=$(browser_eval "document.querySelector('[data-testid=\"test-wizard-summary\"]')?.textContent")
echo "$VALUE" | grep -qE "[0-9]+/[0-9]+ passed" && pass "Event tests ran: $VALUE" || fail "Event tests: $VALUE"

# Close wizard and instruct overlay
browser_eval "document.querySelector('[data-testid=\"test-wizard-close\"]')?.click()" > /dev/null
sleep 0.3
browser_eval "document.querySelector('[data-testid=\"instruct-close\"]')?.click()" > /dev/null
sleep 0.3

# ============================================================================
# PHASE 6: Debug + Instruct independence
# ============================================================================
echo ""
echo "--- PHASE 6: Debug + Instruct independence ---"

# 32. Open debug footer
browser_eval "document.querySelector('[data-testid=\"debug-footer-bar\"]')?.click()" > /dev/null
sleep 0.3
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug panel opened" || fail "Debug panel missing"

# 33. Open instruct — debug stays open (independent)
browser_eval "document.querySelector('[data-testid=\"toggle-instruct\"]')?.click()" > /dev/null
sleep 0.3
VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug stays open when instruct opened" || fail "Debug closed unexpectedly"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"]') !== null")
[ "$VALUE" = "true" ] && pass "Instruct overlay opened" || fail "Instruct overlay missing"

# 34. Close instruct — debug still open
browser_eval "document.querySelector('[data-testid=\"instruct-close\"]')?.click()" > /dev/null
sleep 0.3
VALUE=$(browser_eval "document.querySelector('[data-testid=\"instruct-overlay\"]')")
[ "$VALUE" = "null" ] && pass "Instruct closed via close button" || fail "Instruct still open"

VALUE=$(browser_eval "document.querySelector('[data-testid=\"debug-panel\"]') !== null")
[ "$VALUE" = "true" ] && pass "Debug still open after instruct closed" || fail "Debug panel not found"

agent-browser close 2>/dev/null || true
print_summary

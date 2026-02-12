# Rive Runtime API — Communication with XState & Web

Research date: 2026-02-12

**Policy: rive-lab strictly does not support deprecated or legacy Rive features. Only current, recommended APIs are used.**

## Overview

Rive exposes two active communication layers for host-app integration. The ViewModel Data Binding system is the primary bridge and maps directly to rive-lab's existing XState machine meta conventions (`riveViewModel`, `riveStateMachine`, `contextProperties`). Rive Scripting (Luau) provides internal logic within `.riv` files that communicates with the host through ViewModel property changes.

**Not supported:**
- ~~State Machine Inputs API~~ (legacy — replaced by ViewModel Data Binding)
- ~~Rive Events / reportedEvents~~ (deprecated — replaced by Data Binding)

---

## Layer 1: ViewModel Data Binding (Primary Bridge)

The recommended approach. A ViewModel is a typed contract between the host app and the Rive animation.

### Supported Property Types

| Type | Purpose | Instance Class |
|------|---------|----------------|
| Number | Numeric values (float) | `ViewModelInstanceNumber` |
| String | Text values | `ViewModelInstanceString` |
| Boolean | Boolean flags | `ViewModelInstanceBoolean` |
| Color | RGBA colors | `ViewModelInstanceColor` |
| Enum | Enumerated values | `ViewModelInstanceEnum` |
| List | Dynamic collections | `ViewModelInstanceList` |
| ViewModel | Nested structures | `ViewModelInstanceViewModel` |
| Trigger | Event activation | `ViewModelInstanceTrigger` |

### Getting ViewModels

```js
const namedVM = rive.viewModelByName("My View Model");
const indexedVM = rive.viewModelByIndex(i);
const defaultVM = rive.defaultViewModel();
```

### Creating Instances

```js
const vmiBlank = viewModel.instance();
const vmiDefault = viewModel.defaultInstance();
const vmiIndexed = viewModel.instanceByIndex(i);
const vmiNamed = viewModel.instanceByName("My Instance");
```

### Binding

```js
// Manual binding
const rive = new rive.Rive({
    autoBind: false,
    onLoad: () => {
        const vmi = vm.instanceByName("My Instance");
        rive.bindViewModelInstance(vmi);
    }
});

// Auto-binding (binds default instance)
const rive = new rive.Rive({
    autoBind: true,
    onLoad: () => {
        let boundInstance = rive.viewModelInstance;
    }
});
```

### Reading and Writing Properties

```js
// Numbers
const numberProp = vmi.number("progress");
numberProp.value = 65;

// Booleans
const boolProp = vmi.boolean("isActive");
boolProp.value = true;

// Strings
const stringProp = vmi.string("statusText");
stringProp.value = "Loading...";

// Colors
const colorProp = vmi.color("accentColor");
colorProp.value = 0xFF000000;
colorProp.rgb(255, 0, 0);
colorProp.opacity(0.5);

// Triggers
const triggerProp = vmi.trigger("reset");
triggerProp.trigger();

// Enums
const enumProp = vmi.enum("mode");
enumProp.value = "Option1";
```

### Nested Properties

```js
// Chained access
const nested = vmi
    .viewModel("ParentVM")
    .viewModel("ChildVM")
    .number("value");

// Forward-slash path
const nested = vmi.number("ParentVM/ChildVM/value");
```

### Observing Changes (Rive to Host)

```js
const numberProperty = vmi.number("progress");
numberProperty.on((event) => {
    console.log("Value changed:", event.data);
});
numberProperty.off(); // Remove all listeners
```

### Data Flow

```
1. Load:        File::import(bytes) deserializes ViewModel definitions
2. Instantiate:  viewModel.defaultInstance() creates runtime data holder
3. Bind:         rive.bindViewModelInstance(vmi) establishes DataContext
4. Modify:       vmi.number("progress").value = 50 (host pushes value)
5. Propagate:    Next advance() applies changes via DataBind objects
6. Animate:      Components update, state machine transitions fire
```

### Design Note

Rive docs state: "At runtime there is limited ability to observe or modify the state directly. This is by design." State machines are indirectly controlled through transitions conditioned on Data Binding properties.

---

## Layer 2: Rive Scripting (Luau — Internal Logic)

Scripts run inside the `.riv` file in a sandboxed Luau environment. They cannot directly call JavaScript. Communication happens through ViewModel property changes.

### What Scripts Can Do

- Access and modify ViewModel properties (`artboard.data`)
- Fire triggers, listen for property changes via `addListener(callback)`
- Draw custom paths (`Path.new()`, `moveTo()`, `lineTo()`, etc.)
- Handle pointer events (`pointerDown()`, `pointerMove()`, `pointerUp()`)
- Implement custom drawables, layout components, data converters

### Script to Host Communication Pattern

```
Luau script
  modifies ViewModel property (prop.value = newValue)
  triggers change notification via ViewModelInstanceValueDelegate
  marks DataBind as dirty
  host .on() callback fires
  XState send()
```

### Constraints

- 50ms execution timeout per script
- Sandboxed: no file I/O, OS operations, or debug introspection
- Custom `require()` only loads pre-registered modules
- Cannot directly invoke JavaScript functions

---

## Mapping to rive-lab XState Conventions

### Current Machine Meta to Rive ViewModel Contract

rive-lab machines already define the exact contract Rive's Data Binding expects:

| XState Machine Meta | Rive Equivalent |
|---------------------|-----------------|
| `meta.riveViewModel` | ViewModel name to bind |
| `meta.riveStateMachine` | State machine to play |
| `meta.contextProperties[].name` | ViewModel property name |
| `meta.contextProperties[].type` | ViewModel property type (number/boolean/string) |
| `meta.contextProperties[].range` | Validation constraint |
| `meta.contextProperties[].description` | Human-readable docs |

### Example: ProgressBarSM

```
XState context:     { progress: 0, statusText: '', isActive: false }
Rive ViewModel:     ProgressBarVM
  - progress:       number [0,100]
  - statusText:     string
  - isActive:       boolean
```

The property names, types, and ranges in rive-lab machines are meant to be the ViewModel schema. A designer reads the machine meta, creates a ViewModel with matching names, and the swap is seamless.

---

## Opportunities

### A. Test Wizard Verification

Load a `.riv` file, bind the ViewModel, compare XState context values against Rive ViewModel values:

```
XState:  progress = 0, state = idle
Rive VM: progress = 0
PASS: values match
```

### B. Bidirectional Sync

```
+---------------+     ViewModel      +----------------+
|   XState      | <----------------> |  Rive File     |
|   Machine     |    properties      |  (animation)   |
|               |                    |                |
|  context: {   |  progress <-> progress              |
|    progress   |  isActive <-> isActive              |
|    isActive   |  state    ->  state label           |
|  }            |  reset    ->  trigger               |
+---------------+                    +----------------+
```

On XState transition: push context values to ViewModel.
On Rive ViewModel change: send events to XState.

### C. Contract Validation

Use `extractMachineDoc` output + loaded `.riv` file to validate:

```
Contract says:  ProgressBarVM has number "progress" [0,100]
Rive file has:  ProgressBarVM.progress is number
                range [0,100] confirmed
```

### D. Live Inspector

Using ViewModel `.on()` listeners:
- All ViewModel property values in real-time
- XState and Rive agreement status
- Event log of transitions and property changes

---

## Sources

- [Rive Data Binding Runtime Docs](https://rive.app/docs/runtimes/data-binding)
- [Rive State Machines](https://rive.app/docs/runtimes/state-machines)
- [Rive Web (JS) Runtime](https://rive.app/docs/runtimes/web/web-js)
- [Rive Scripting Announcement](https://rive.app/blog/scripting-is-live-in-rive)
- [Why Rive Scripting Runs on Luau](https://rive.app/blog/why-scripting-runs-on-luau)
- [ViewModel Architecture (DeepWiki)](https://deepwiki.com/rive-app/rive-runtime/7.1-viewmodel-architecture)
- [Scripting System (DeepWiki)](https://deepwiki.com/rive-app/rive-runtime/8-scripting-system)
- [Rive Data Binding Blog](https://rive.app/blog/data-binding-in-rive-a-shared-language-for-designers-and-developers)
- [rive-wasm GitHub](https://github.com/rive-app/rive-wasm)
- [Rive Parameters](https://rive.app/docs/runtimes/web/rive-parameters)

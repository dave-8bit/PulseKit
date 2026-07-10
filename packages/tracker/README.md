# @pulsekit/tracker

Standalone TypeScript SDK for emitting PulseKit tracking events.

## Install

```bash
npm i @pulsekit/tracker
```

## Usage

### 1) Initialize

```ts
import { init } from '@pulsekit/tracker'

init({
  clientId: 'your-client-id',
  workspaceId: 'your-workspace-id'
})
```

### 2) Track an event

```ts
import { track } from '@pulsekit/tracker'

track({
  type: 'CORE_EVENT',
  payload: {
    // ...
  }
})
```


// Timers in a dedicated worker aren't subject to the heavy throttling browsers apply to hidden tabs,
// so ticks keep arriving about once a second while you work in other windows.
setInterval(() => postMessage(Date.now()), 1000);

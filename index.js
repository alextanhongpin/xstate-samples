import xstate from "xstate";
const { interpret, State } = xstate;
import { circuitBreakerMachine } from "./circuit-breaker.js";

function delay(duration = 1000) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true);
    }, duration);
  });
}

async function main() {
  const newMachine = circuitBreakerMachine
    .withContext({
      successThreshold: 3,
      failureThreshold: 3,
      timeoutThreshold: 3000
    })
    .withConfig({
      services: {
        operation: async (ctx, evt) => {
          if (evt.error || ctx.error) {
            throw new Error("bad request");
          }
          // do work...
          return true;
        }
      }
    });
  const service = interpret(newMachine)
    .onTransition(state => {
      console.log(state.value);
    })
    .onDone(state => {
      console.log("done", state);
    })
    .start();

  const n = Array(20)
    .fill(0)
    .map((_, i) => i);

  for await (let i of n) {
    service.send("DO", i < 10 && { error: true });
    if (service.state.matches("open")) {
      console.log("too many requests:", service.state.value);
      await delay(1000);
      continue;
    }
    console.log(service.state.context);
    await delay(1000);
  }
  console.log("done", service.state.done);
  service.stop();

  // Persisting state.
  const jsonState = JSON.stringify(service.state);
  console.log("serialized", jsonState);

  const stateDefinition = JSON.parse(jsonState);
  const resolvedState = State.create(stateDefinition);
  const newService = interpret(circuitBreakerMachine).start(resolvedState);
  // Or...
  // circuitBreakerMachine.resolveState(resolveState)
}

main().catch(console.error);

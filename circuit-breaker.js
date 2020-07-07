import xstate from "xstate";
const { Machine, assign } = xstate;

// Guards.
const failureThresholdReached = (ctx, evt) =>
  ctx.failureCount >= ctx.failureThreshold;

const timeoutTimerExpired = (ctx, evt) => {
  const elapsed = Date.now() - ctx.timeout;
  return elapsed >= ctx.timeoutThreshold;
};

const successCountThresholdReached = (ctx, evt) =>
  ctx.successCount >= ctx.successThreshold;

// Actions.
const incrementFailureCounter = (ctx, evt) => ctx.failureCount + 1;
const incrementSuccessCounter = (ctx, evt) => ctx.successCount + 1;
const startTimeoutTimer = (ctx, evt) => Date.now();
const resetSuccessCounter = (ctx, evt) => 0;
const resetFailureCounter = (ctx, evt) => 0;
const operationFailed = (ctx, evt) => !!ctx.error;

export const circuitBreakerMachine = Machine(
  {
    id: "circuit-breaker",
    initial: "closed",
    context: {
      successThreshold: 5,
      failureThreshold: 5,
      timeoutThreshold: 5000,
      successCount: 0,
      failureCount: 0,
      timeout: 0,
      error: null,
      result: null
    },
    states: {
      closed: {
        id: "closed",
        entry: assign({
          failureCount: resetFailureCounter
        }),
        initial: "idle",
        states: {
          idle: {
            on: {
              DO: "do"
            }
          },
          do: {
            invoke: {
              src: "operation",
              onDone: {
                target: "idle",
                actions: assign({
                  result: (ctx, evt) => evt.data
                })
              },
              onError: {
                target: "idle",
                actions: assign({
                  error: (ctx, evt) => evt.data,
                  failureCount: incrementFailureCounter
                })
              }
            }
          }
        },
        always: {
          cond: "failureThresholdReached",
          target: "open"
        }
      },
      open: {
        entry: assign({
          timeout: startTimeoutTimer
        }),
        initial: "idle",
        states: {
          idle: {
            on: {
              DO: "do"
            }
          },
          do: {
            invoke: {
              src: "operation",
              onDone: "idle",
              onError: "idle"
            }
          }
        },
        always: {
          target: "halfOpen",
          cond: "timeoutTimerExpired"
        }
      },
      halfOpen: {
        entry: assign({
          successCount: resetSuccessCounter,
          error: () => null
        }),
        initial: "idle",
        states: {
          idle: {
            on: {
              DO: "do"
            }
          },
          do: {
            invoke: {
              src: "operation",
              onDone: {
                target: "idle",
                actions: assign({
                  successCount: incrementSuccessCounter
                })
              },
              onError: {
                target: "idle",
                actions: assign({
                  error: (ctx, evt) => evt.data
                })
              }
            }
          }
        },
        always: [
          { target: "open", cond: "operationFailed" },
          { target: "closed", cond: "successCountThresholdReached" }
        ]
      }
    }
  },
  {
    guards: {
      failureThresholdReached,
      timeoutTimerExpired,
      successCountThresholdReached,
      operationFailed
    },
    services: {
      operation: async (ctx, evt) => {
        throw new Error("not implemented");
      }
    }
  }
);

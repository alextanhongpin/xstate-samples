
  const friendMachine = Machine({
    id: 'friend',
    initial: 'start',
    context: {
    },
    states: {
      start: {
        // TODO: Check friend status.
        on: {
          '': 'friend'
        }
      },
      friend: {
        on: {
          UNFRIEND: 'stranger',
          BLOCK: 'blocked'
        }
      },
      stranger: {
        on: {
          ADD: 'pending',
          BLOCK: 'blocked'
        }
      },
      incoming: {
        on: {
          ACCEPT: 'friend',
          REJECT: 'stranger',
          BLOCK: 'blocked'
        }
      },
      pending: {
        on: {
          CANCEL: 'stranger'
        }
      },
      blocked: {
        on: {
          UNBLOCK: 'stranger'
        }
      }
    }
  });
  
  

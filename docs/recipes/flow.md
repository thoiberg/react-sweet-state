## Typing **sweet-state** with Flow

This is a basic example:

```js
import { createStore, createSubscriber, createHook, createContainer, type StoreActionApi } from 'react-sweet-state';

type State = {| count: number |};
type StoreApi = StoreActionApi<State>;
type Actions = typeof actions;

const initialState: State = {
  count: 0,
};

const actions = {
  increment: (by = 1) => ({ setState, getState }: StoreApi) => {
    setState({
      count: getState().count + by,
    });
  },
};

const Store = createStore<State, Actions>({
  initialState,
  actions,
});

const CounterSubscriber = createSubscriber<State, Actions>(Store);
const useCounter = createHook<State, Actions>(Store);
const CounterContainer = createContainer<State, Actions>(Store);
```

#### Actions pattern

If your actions require `Container` props, just type the second argument:

```js
type ContainerProps = {| multiplier: number |};

const actions = {
  increment: (by = 1) => (
    { setState, getState }: StoreApi<State>,
    { multiplier }: ContainerProps
  ) => {
    setState({ count: getState().count + by * multiplier });
  },
};
```

#### createSubscriber / createHook patterns

If you provide a selector to your components, you need to defined two additional flow arguments to `createSubscriber`/`createHook`: the selector output and the selector props.

```js
type SelectorState = boolean;
const selector = (state: State): SelectorState => state.count > 0;

// this component does not accept props
const CounterSubscriber = createSubscriber<State, Actions, SelectorState, void>(Store, {
  selector,
});

// this hook does not accept arguments
const useCounter = createHook<State, Actions, SelectorState, void>(Store, {
  selector,
});
```

In case your component/hook needs also some props, you can define them as fourth argument:

```js
type SelectorProps = {| min: number |};
type SelectorState = boolean;
const selector = (state: State, props: SelectorProps): SelectorState => state.count > props.min;

// this component requires props
const CounterSubscriber = createSubscriber<State, Actions, SelectorState, SelectorProps>(Store, {
  selector,
});

// this hook requires an argument
const useCounter = createHook<State, Actions, SelectorState, SelectorProps>(Store {
  selector,
});
```

#### createContainer patterns

If your container requires additional props:

```js
type ContainerProps = {| multiplier: number |};

// this component requires props
const CounterContainer = createContainer<State, Actions, ContainerProps>(Store);
```

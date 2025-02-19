/* eslint-env jest */

import React, { Component } from 'react';
import { mount } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { StoreMock, storeStateMock } from '../../__tests__/mocks';
import { createHook } from '../hook';
import { defaultRegistry } from '../../store/registry';

jest.mock('../../store/registry', () => {
  const mockRegistry = {
    configure: jest.fn(),
    getStore: jest.fn(),
  };
  return {
    __esModule: true,
    StoreRegistry: jest.fn().mockImplementation(() => mockRegistry),
    defaultRegistry: mockRegistry,
  };
});

describe('Hook', () => {
  const actions = {
    increase: expect.any(Function),
    decrease: expect.any(Function),
  };

  const setup = (props = {}, selector) => {
    const childrenFn = jest.fn().mockReturnValue(null);
    const useHook = createHook(StoreMock, { selector });
    const Subscriber = ({ children, ...p }) => {
      const [s, a] = useHook(p);
      return children(s, a);
    };
    const getElement = () => <Subscriber {...props}>{childrenFn}</Subscriber>;
    // const getShallow = () => shallow(getElement());
    const getMount = () => mount(getElement());
    return {
      getElement,
      // getShallow,
      getMount,
      children: childrenFn,
    };
  };

  beforeEach(() => {
    defaultRegistry.getStore.mockReturnValue({
      storeState: storeStateMock,
      actions: StoreMock.actions,
    });
    storeStateMock.getState.mockReturnValue(StoreMock.initialState);
  });

  it('should get the storeState from registry', () => {
    const { getMount } = setup();
    getMount();
    expect(defaultRegistry.getStore).toHaveBeenCalledWith(StoreMock);
  });

  it('should render children with store data and actions', () => {
    const { getMount, children } = setup();
    getMount();
    expect(children).toHaveBeenCalledTimes(1);
    expect(children).toHaveBeenCalledWith({ count: 0 }, actions);
  });

  it('should update when store calls update listener', () => {
    const { getMount, children } = setup();
    storeStateMock.getState.mockReturnValue({ count: 1 });
    getMount();

    expect(storeStateMock.subscribe).toHaveBeenCalled();
    const newState = { count: 2 };
    storeStateMock.getState.mockReturnValue(newState);
    const update = storeStateMock.subscribe.mock.calls[0][0];
    act(() => update(newState));

    expect(children).toHaveBeenCalledTimes(2);
    expect(children).toHaveBeenCalledWith({ count: 1 }, actions);
    expect(children).toHaveBeenLastCalledWith({ count: 2 }, actions);
  });

  it('should avoid re-render children when just rendered from parent update', () => {
    const { getElement, children } = setup();
    class App extends Component {
      render() {
        return getElement();
      }
    }
    const wrapper = mount(<App />);
    // simulate store change -> parent re-render -> yield listener update
    const newState = { count: 1 };
    storeStateMock.getState.mockReturnValue(newState);
    wrapper.setProps({ foo: 1 });
    const update = storeStateMock.subscribe.mock.calls[0][0];
    act(() => update(newState));

    expect(storeStateMock.getState).toHaveBeenCalled();
    expect(children).toHaveBeenCalledTimes(2);
    expect(children).toHaveBeenCalledWith(newState, actions);
  });

  it('should remove listener from store on unmount', () => {
    const { getMount } = setup();
    const unsubscribeMock = jest.fn();
    storeStateMock.subscribe.mockReturnValue(unsubscribeMock);
    const wrapper = getMount();
    wrapper.unmount();
    expect(unsubscribeMock).toHaveBeenCalled();
  });

  it('should not set state if updated after unmount', () => {
    jest.spyOn(console, 'error');
    const { getMount } = setup();
    storeStateMock.subscribe.mockReturnValue(jest.fn());
    const wrapper = getMount();
    const newState = { count: 1 };
    storeStateMock.getState.mockReturnValue(newState);
    const update = storeStateMock.subscribe.mock.calls[0][0];
    wrapper.unmount();
    act(() => update(newState));

    expect(console.error).not.toHaveBeenCalled();
  });

  it('should render children with selected return value', () => {
    const selector = jest.fn().mockReturnValue({ foo: 1 });
    const { getMount, children } = setup({ prop: 1 }, selector);
    getMount();
    expect(selector).toHaveBeenCalledWith(StoreMock.initialState, { prop: 1 });
    expect(children).toHaveBeenCalledWith({ foo: 1 }, actions);
  });

  it('should re-render children with selected return value', () => {
    const selector = jest.fn().mockReturnValue({ foo: 1 });
    const { getMount, children } = setup({}, selector);
    getMount();
    const newState = { count: 1 };
    selector.mockReturnValue({ foo: 2 });
    storeStateMock.getState.mockReturnValue(newState);
    const update = storeStateMock.subscribe.mock.calls[0][0];
    act(() => update(newState));
    expect(children).toHaveBeenLastCalledWith({ foo: 2 }, actions);
  });

  it('should update on state change if selector output is not shallow equal', () => {
    const selector = jest.fn().mockImplementation(() => ({ foo: [1] }));
    const { getMount, children } = setup({}, selector);
    getMount();
    const newState = { count: 1 };
    storeStateMock.getState.mockReturnValue(newState);
    const update = storeStateMock.subscribe.mock.calls[0][0];
    act(() => update(newState));

    expect(children).toHaveBeenCalledTimes(2);
  });

  it('should not update on state change if selector output is shallow equal', () => {
    const selector = jest.fn().mockImplementation(() => ({ foo: 1 }));
    const { getMount, children } = setup({}, selector);
    getMount();
    const newState = { count: 1 };
    storeStateMock.getState.mockReturnValue(newState);
    const update = storeStateMock.subscribe.mock.calls[0][0];
    act(() => update(newState));

    expect(children).toHaveBeenCalledTimes(1);
    // ensure that on state change memoisation breaks
    expect(selector).toHaveBeenCalledTimes(2);
  });

  it('should not recompute selector if state & props are equal', () => {
    const selector = jest.fn().mockReturnValue({ foo: 1 });
    const { getMount } = setup({ bar: 1 }, selector);
    const wrapper = getMount();
    wrapper.setProps({ bar: 1 });

    // ensure memoisation works
    expect(selector).toHaveBeenCalledTimes(1);
  });

  it('should not update on state change if selector is null', () => {
    const selector = null;
    const { getMount, children } = setup({}, selector);
    getMount();

    const newState = { count: 1 };
    storeStateMock.getState.mockReturnValue(newState);
    const update = storeStateMock.subscribe.mock.calls[0][0];
    act(() => update(newState));

    expect(children).toHaveBeenCalledTimes(1);
    expect(children).toHaveBeenCalledWith(undefined, actions);
  });
});

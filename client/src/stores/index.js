import CommonStore from './CommonStore';
import TimerStore from './TimerStore';

export const stores = (state = {}) => ({
  common: new CommonStore(state.common),
  timer: new TimerStore(state.timer),
});

export default stores(window.STATE || {});
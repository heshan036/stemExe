// @flow
import * as actions from '../action_type';

export default function popups(state='', action) {
  switch (action.type) {
    case actions.ACTKEY_PUT:
      return action.actKey;
    default:
      return state;
  }
}

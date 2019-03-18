// @flow
import cookie from '../../cookie/cookie';
import * as userActions from '../action_type';
import {ipcRenderer} from 'electron';
// import { Object } from 'core-js/library/web/timers';


// type actionType = {
//   +type: string
// };

export default function user(state=null, action) {
  switch (action.type) {
    case userActions.GET_USER_INFO:
      return state;
    case userActions.USER_CLASS_TOGGLE:
      let user = Object.assign({},state,{classInd:action.classInd});
      ipcRenderer.send('user', JSON.stringify(user));
      return user;
    case userActions.LOGIN_IN:
      return action.user;
    case userActions.LOGIN_OUT:
      return null;
    case userActions.SAVE_USER_INFO:
      return action.user;
    default:
      return state;
  }
}


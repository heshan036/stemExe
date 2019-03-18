// @flow
import { combineReducers } from 'redux';
import { routerReducer as router } from 'react-router-redux';
import actKey from './actKey';
import user from './user';

export type stateType = {
  +user: object,
  +actKey:string
};


const rootReducer = combineReducers({
  actKey,
  user,
  router,
});

export default rootReducer;

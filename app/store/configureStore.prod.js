// @flow
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { createHashHistory} from 'history';
import { routerMiddleware } from 'react-router-redux';
import rootReducer from './reducers';
import type { stateType } from './reducers/index';

const history = createHashHistory();
const router = routerMiddleware(history);
const enhancer = applyMiddleware(thunk, router);

function configureStore(initialState?: stateType) {
  return createStore(rootReducer, initialState, enhancer);
}

export default { configureStore, history };

// @flow
import * as actions from '../action_type';

export const actKey_put=(actKey)=>{
  return{
    type:actions.ACTKEY_PUT,
    actKey
  }
}


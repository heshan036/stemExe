// @flow
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import Home from '../components/Home';
import * as userActions from '../store/actions/user';
import * as actKeyActions from '../store/actions/actKey';

function mapStateToProps(state) {
  return {
    user: state.user,
    actKey:state.actKey
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({...userActions,...actKeyActions}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(Home);

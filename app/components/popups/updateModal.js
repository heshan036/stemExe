import React , {Component} from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './popups.global.css'

class UpdateModal extends Component{
  constructor(props){
    super(props);
    console.log(props)
    this.onModalToggle=this.onModalToggle.bind(this)
  }

  componentDidMount(){

  }

  onModalToggle(visibleFlag){
      this.props.onModalToggle(visibleFlag);
  }

  render(){
    return(
      <div className="updateWrapper">
        
      </div>
    )
  }
}

export default UpdateModal

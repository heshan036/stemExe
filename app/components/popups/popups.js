import React , {Component} from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import './popups.global.css'

class MainPopups extends Component{
  constructor(props){
    super(props);
    this.onModalToggle=this.onModalToggle.bind(this)
  }

  componentDidMount(){

  }

  onModalToggle(visibleFlag){
      this.props.setStateValue('formModalVisible',false);
  }

  render(){
    let popStyle={
      display:this.props.formModalVisible ? 'block':'none'
    }
    return(
      <div className="popupsWrapper" style={popStyle}>
        <div className="popupsBox mainPop">
          {this.props.modalType !== 'errTimeRemind' && (<span className="popupsClose" onClick={()=> this.onModalToggle(false)}>
            <i className="iconfont icon-chahao"></i>
          </span>)}
          <h2 className="modalTitle2">
            { (this.props.modalType==='expiringRemind') && <p><b>到期提醒</b></p>}
            {(this.props.modalType==='expiryTimeRemind' ||this.props.modalType === "systemFirm" || this.props.modalType=== 'errTimeRemind' || this.props.modalType === 'freeTrial' || this.props.modalType === 'actCourse') && <p><b>系统提醒</b></p>}
            {(this.props.modalType === "systemFirm" || this.props.modalType=== 'errTimeRemind' ||this.props.modalType==='expiryTimeRemind' || this.props.modalType==='expiringRemind' || this.props.modalType === 'freeTrial') && <img src="./resource/images/system_bg1.png" className="pin"/>}
          </h2>
          <div className="center_modalCon">
            {this.props.children}
          </div>
        </div>
        <div className="popupsBg" onClick={() =>
          {
            if(this.props.modalType !== 'errTimeRemind'){            
              this.onModalToggle(false)
            }
          }
        }>      
        </div>
      </div>
    )
  }
}

MainPopups.propTypes = {
  formModalVisible: PropTypes.bool,
  onModalToggle:PropTypes.func,
  modalType:PropTypes.string
}

export default MainPopups

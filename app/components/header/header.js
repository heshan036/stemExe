import React , {Component} from 'react';
import { Link } from 'react-router-dom';
import {history } from '../../store/configureStore';
import styles from './header.css';
import MainPopups from '../popups/popups';
import SystemModal from '../systemModal';
const {ipcRenderer} = require('electron');

var butStyel={
    width:"3.645vw",
    height:"3.645vw",
    lineHeight:"3.645vw",
    transition:" all 0.3s ease 0s"
}

class Header extends Component{

  constructor(props){
    super(props);
    console.log(props)
    this.state={
      formModalVisible: false
      
    };
    this.setStateValue=this.setStateValue.bind(this);
    this.hideWin=this.hideWin.bind(this);
  }
  //小化
  hideWin(){
    ipcRenderer.send('hide-window');
  }

  // 改变state
  setStateValue(feild,value){
      this.setState({
        [feild]:value
      })
  }

  backHandle(){
    if(this.props.iframeBack){
      this.props.iframeBack();
    }else{
      history.goBack();
    }
  }

/*
 * backIconFlag:控制返回是否显示【true:隐藏  空/false：显示】（为了避免影响全局头部调用使用方法与homeIconFlag完全相反）
 */
  render(){
    const that=this;
    return(
      <div className={styles.common_header}>

        <p className={styles.h_btn_group_l} style={{height:"3.645vw",marginBottom:0}}>

          {this.props.backIconFlag !== '1'  && <span style={butStyel} onClick={()=>this.backHandle()}><i className="iconfont icon-fanhui fvw43" /></span>}
          {this.props.homeIconFlag && <Link style={butStyel} to="/homePage"><i className="iconfont icon-home fvw39" /></Link>}

        </p>
        <h1>{this.props.children}</h1>
        <p className={styles.h_btn_group}>
          <span onClick={this.hideWin}><i className="iconfont icon-jian"></i></span>
          <span onClick={()=>{this.formMolalType = "systemFirm";this.setStateValue('formModalVisible',true)}}><i className="iconfont icon-cha"></i></span>
        </p>
        <MainPopups
        formModalVisible={this.state.formModalVisible}
        setStateValue={this.setStateValue}
        modalType={this.formMolalType}>
          {this.formMolalType === "systemFirm" && <SystemModal setStateValue={that.setStateValue} systemType="systemFirm"></SystemModal>}
        </MainPopups>
      </div>
    )
  }
}

export default Header

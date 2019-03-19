import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import { history } from '../../store/configureStore';
import {Row,Col ,Icon,Menu,Card,Pagination,Select,Button} from 'antd';
import MainPopups from '../popups/popups';
import SystemModal from '../systemModal';
import styles from  './sideList.css';
const {ipcRenderer} = require('electron');
const { Meta } = Card;

class SideList extends Component{
  // props: Props;

  constructor(props){
    super(props);
    this.state={
      curList:this.props.curList
    };
    this.hideWin=this.hideWin.bind(this);
    this.setStateValue=this.setStateValue.bind(this);
  }

  //窗口最小化到托盘
  hideWin(){
    ipcRenderer.send('hide-window');
  }

  // 改变state
  setStateValue(feild,value){
    this.setState({
      [feild]:value
    })
  }


  render(){
    const that=this;
    return(
      <div className={styles.subList}>
        <h1>
           <span className={styles.backBtn} onClick={()=> history.goBack()}><i className="iconfont icon-fanhui fvw43" /></span>
          {this.props.children.map((child,index)=>{
              if(child.key === 'title'){
                return child
              }
            })
          }
          {this.props.title}
          <p className={styles.h_btn_group}>
            <span onClick={this.hideWin}><i className="iconfont icon-jian"></i></span>
            <span onClick={()=>{this.formMolalType = "systemFirm";this.setStateValue('formModalVisible',true)}}><i className="iconfont icon-cha "></i></span>
          </p>
        </h1>

          {!this.props.network &&
            <div className="noPage">
              <img src="./resource/images/no_wifi.png"/>
              <p>当前网络不可用，请检查您的网络设置</p>
              <Button onClick={()=>this.props.getList()} className="tbn_green">立即刷新</Button>
            </div>
          }

          {(this.props.actPageFlag && this.props.network) && 
            <div className="noPage">
              {this.props.children.map((child,index)=>{
                return child
              })}
            </div>
          }

          {(this.props.network && this.props.curList && this.props.curList.length > 0) &&
            this.props.children.map((child,index)=>{
              if(child.key !== 'title'){
                return child
              }
            })
          }
          {(this.props.network && this.props.curList && this.props.curList.length < 1) &&
            <div className="noPage" style={{display:this.props.refreshLoading ? 'none':'block'}}>
              <img src="./resource/images/no_con.png"/>
              <p>
                {this.props.noDataTip}
              </p>
            </div>
          }
          <MainPopups
          formModalVisible={this.state.formModalVisible}
          setStateValue={this.setStateValue}
          modalType={this.formMolalType}>
            {this.formMolalType === "systemFirm" && <SystemModal setStateValue={that.setStateValue}  systemType="systemFirm"></SystemModal>}
          </MainPopups>
      </div>
    )
  }
}

export default SideList

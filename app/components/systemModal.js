import React , {Component} from 'react';
import { Button} from 'antd';
import PropTypes from 'prop-types';
import styles from './systemModal.css';
import cookie from '../cookie/cookie';
import { history } from '../store/configureStore';
import {platformAPI} from '../api/platform_api';
import API from '../api/api';
import {netReqUrl} from '../api/networkReq';
import {Row,Col ,Icon,Modal,message} from 'antd';
import macAPI from '../api/macApi';
import storeAPI from '../api/storeAPI';
import {ipcRenderer,remote} from  'electron';
import { parse } from 'querystring';
const nowDate=new Date(remote.getGlobal('globalDatas').loadTime);
const nowTime=nowDate.getTime();
const isOneAct = remote.getGlobal('globalDatas').isOneAct;
let oneActInfo = "";

//props.systemType类型：
// 'expiryTimeRemind'：激活信息到期，搭配传参codeType(课程)和term（学期），值与后台对应；
// 'errTimeRemind'离线状态下，时间错误提示；
// 'actCourse'课程激活提示；
// 'actPlayClass'特色课程激活提示；
// 'actPrimary'幼小衔接激活提示；
// 'systemFirm'云宝贝关闭提示；
// 'teachResourceRemind'资源类激活提示，包括教学资源和绘本馆；
// 'actCodeRemind'激活确认；
// 'expiringRemind'到期30天提醒

class SystemModal extends Component{
  constructor(props){
    super(props);
    oneActInfo = remote.getGlobal('globalDatas').oneActInfo;
    console.log(props)
    this.state={
      msg:"确定要关闭云宝贝吗？",
      btn1:'再看看',
      btn2:'确定',
      btn_loading:false,
      loadData_txt:'激活成功，正在下载数据，请保持网络通畅!',
      loadData_progress:'0',
      loadingFlag:false
    };
    this.closeModal=this.closeModal.bind(this);
    this.closeApp=this.closeApp.bind(this);
    this.sureHandle=this.sureHandle.bind(this);
    this.freeTial=this.freeTial.bind(this);
    this.downloadData = this.downloadData.bind(this)
  }

  componentDidMount(){
    console.log(this.props.systemType);
    const that = this;
    this._isMounted = true;
    if(this.props.systemType === 'expiryTimeRemind'){
      let actCode= oneActInfo;
      if(actCode && actCode.dealerName && actCode.dealerTel){
        this.setState({
          msg:'您的课程使用权限已到期',
          msg1:'请联系当地服务中心【'+actCode.dealerName+actCode.dealerTel+'】进行续费',
          btn1:'立即激活课程',
          btn2:'关闭',
        })
      }else{
        this.setState({
          msg:'您的课程使用权限已到期',
          msg1:'请联系服务中心进行续费',
          btn1:'立即激活课程',
          btn2:'关闭',
        })
      }
    }else if(this.props.systemType === 'errTimeRemind'){
      this.setState({
        msg:"云宝贝检测到您的系统时间有调整，请调回正确的时间后重新启动程序！",
        msg1:'',
        btn1:'确定',
        btn2:''
      })
    }else if(this.props.systemType==='actCourse'){
      this.setState({
        msg:"您没有当前课程的使用权限，请联系当地服务中心购买并激活！",
        btn1:'立即激活课程',
        btn2:'关闭'
      })
    }else if(this.props.systemType==='systemFirm'){
      let msg =  remote.getGlobal('globalDatas').updateFlag ?  "正在下载更新文件，确定要关闭云宝贝吗？" : "确定要关闭云宝贝吗？";
      this.setState({
        msg:msg,
        msg1:'',
        btn1:'确定',
        btn2:'取消'
      })
    }else if(this.props.systemType === 'expiringRemind'){
      let expiringCode = this.props.expiringCode;
      let ducDate = '';
      try{
        let duration = parseInt(oneActInfo.expiry) - nowTime;
        ducDate = duration / (24*60*60*1000)
      }catch(err){
        console.log(err)
      };
      let noticeTip = "您的课程使用权限只有"+parseInt(ducDate)+"天到期，请联系当地服务中心【"+oneActInfo.dealerName+oneActInfo.dealerTel+"】进行续费！";
      this.setState({
        msg:noticeTip,
        btn1:'知道了',
        btn2:'不再提醒'
      })
    }else if(this.props.systemType === 'freeTrial'){
      this.setState({
        msg:"云宝贝送您七天免费体验啦，可查看全部课程哦，赶快试一试吧！",
        btn1:'立即体验',
        btn2:'不再提示'
      })
    }
  }

  componentWillUnmount() {
      this._isMounted = false
  }

  //退出
  closeApp=()=>{

    ipcRenderer.send('window-all-closed');
  }

  //关闭弹窗
  closeModal=(visibleFlag)=>{
    this.props.setStateValue('formModalVisible',false);
  }

  sureHandle=()=>{
    const that=this;
    if(isOneAct && (this.props.systemType === 'actCourse' || this.props.systemType ==='expiryTimeRemind')){
      try{
        this.props.setStateValue('formModalVisible',false);
      }catch(err){
        console.log(err)
      };
      history.push('/scanCode');
      return;
    };
    //跳转至激活页面
    if(this.props.systemType === 'expiryTimeRemind'){
      try{
        this.props.setStateValue('formModalVisible',false);
      }catch(err){
        console.log(err)
      };
      history.push('/scanCode');
      return;
    };
    // 关闭程序
    if(this.props.systemType==='systemFirm' || this.props.systemType==='errTimeRemind'){
      that.closeApp();
      return
    };
    if(this.props.systemType === 'expiringRemind'){
      this.timeRemindSureHandle();
      return
    }

    if(this.props.systemType === 'freeTrial'){
      this.freeTial();
      return
    }
  }


 // 免费7天体验
  freeTial=async ()=>{
    const that=this;
    if(!navigator.onLine){
      message.info('当前网络不可用，请检查您的网络设置');
      return
    };
    let reqNetAdd = isOneAct ? 'CheckDeviceReq':'CheckKeyBatchReq';
    try{
      let result=await API.requestNet('CheckDeviceReq',{isOpenTrial:true},2);
      console.log(result);
      if(result.status === 0 && result.rsp.trialMsg){
        message.success('恭喜您获得七天免费体验')
        storeAPI.setObject('freeTrial',result.rsp.trialMsg);
      }else{
        try{
          message.info(result.msg); //提示错误信息
        }catch(err){
          console.log(err)
        }
      };
      setTimeout(()=>{
        that.props.setStateValue('formModalVisible',false)
        that.props.setStateValue('freeTialFlag',true);
        that.props.freeTialHandle();
      },2000)
    }catch(err){
      console.log(err);
      that.setState({
        btn_loading:false
      });
    }
  }

  // 取消7天免费体验
  freeTrialConcel(){
    storeAPI.set('freeTrialConcel','1');
    this.props.setStateValue('formModalVisible',false)
  }

  // 体验激活成功后，下载数据至本地
  downloadData(){
    const that=this;
    API.downData((progress)=>{
      if(that._isMounted){
        if(progress === 'done'){
            console.log(progress)
            that.setState({
              loadingFlag:false
            });
            that.props.onModalToggle(false);
            that.props.setStateValue('freeTialFlag',true);
            that.props.freeTialHandle();
        }else{
            that.setState({
              loadData_progress:progress
            })
        }
      }
    })
  }

  timeRemindSureHandle=()=>{
    let now=(new Date()).toLocaleDateString();
    cookie.setCookie('timeRemind_'+this.props.expiringCode.code+'',now,1);
    this.props.setStateValue('formModalVisible',false)
  }

  timeRemindNotHandle=()=>{
    cookie.setCookie('nottimeRemind_'+this.props.expiringCode.code+'','1',30);
    this.props.setStateValue('formModalVisible',false)
  }

  render(){
    const {loadData_progress,loadData_txt,btn_loading,loadingFlag}=this.state;
    return (
      <div>
        <div className={styles.txt_wrapper}>
          <p className={styles.txt_p} style={{textAlign: this.state.infoList ? 'left' :'center'}}>{this.state.msg}</p>
          {this.state.msg1 && <p className={styles.txt_p}>{this.state.msg1}</p>}
          {this.state.infoList && <ul>
            {this.state.infoList.map((x,index)=>{
              return (<li key={index}>
                {x.name}：有效期 {x.effectiveDate} 至 {x.expiryDate}
              </li>)
            })}
          </ul>}
        </div>
        <div className={styles.btn_group}>
          <Button type="primary"
            onClick={this.sureHandle}
            loading={btn_loading}
          >{this.state.btn1}</Button>
          {this.state.btn2 && <Button onClick={()=>
            {
              if(this.props.systemType === 'expiringRemind'){
                this.timeRemindNotHandle()
              }else if(this.props.systemType === 'freeTrial'){
                this.freeTrialConcel();
              }else{
                this.closeModal(false)
              }
            }
          }>{this.state.btn2}</Button>}
        </div>
        {loadingFlag &&
          <div className={styles.loadingData}>
            <div className={styles.loading}>
            <img src="./resource/images/loading2.gif"/>
              {parseInt(loadData_progress) !== 0 && <p>已下载：{loadData_progress}%</p>}
              <p>{loadData_txt}</p>
            </div>
          </div>
        }
      </div>
    )
  }
}

export default SystemModal

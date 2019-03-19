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
    this._isMounted = true;
    if(this.props.systemType === 'expiryTimeRemind'){
      let actCode= '';
      if(isOneAct){
        actCode = oneActInfo;
      }else{
        let actKey = storeAPI.getActiveKeyObj();
        actCode=actKey ? actKey.codeList.find(x=>{
          if(this.props.term){
            return (x.codeType === this.props.codeType && x.term === this.props.term);
          };
          return x.codeType === this.props.codeType;
        }) : null;
      };
      if(actCode && actCode.dealerName && actCode.dealerTel){
        this.setState({
          msg:'您的课程使用权限已到期',
          msg1:'请联系当地服务中心【'+actCode.dealerName+actCode.dealerTel+'】进行续费',
          btn1:'立即激活课程',
          btn2:'关闭',
        })
      }else{
        this.setState({
          msg:'您的课程试用权限已到期',
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
    }else if(this.props.systemType==='actPlayClass' || this.props.systemType==='actPrimary' || this.props.systemType==='actCourse'){
      let courseName;
      if(this.props.systemType==='actPlayClass'){
        courseName="【特色课程】"
      }else if(this.props.systemType==='actPrimary'){
        courseName="【幼小衔接】"
      }else if(this.props.systemType==='actCourse'){
        courseName="课程"
      };
      this.setState({
        msg:"您没有"+courseName+"使用权限，请联系当地服务中心购买并激活！",
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
    }else if(this.props.systemType==='teachResourceRemind'){
      this.setState({
        msg:"您没有该模块使用权限，请联系当地服务中心购买任意【特色课程】、【主题课程】、【幼小衔接】模块的课程并激活，即可使用！",
        btn1:'立即激活课程',
        btn2:'关闭'
      })
    }else if(this.props.systemType==='actCodeRemind' || this.props.systemType==='actCodeChangeRemind'){
      this.setState({
        msg:"您要激活的课程信息如下，确认要激活吗？",
        btn1:'确定',
        btn2:'取消',
        infoList:this.props.actInfoList
      })
    }else if(this.props.systemType === 'expiringRemind'){
      let noticeTip = '';
      if(this.props.expiringCode){
        let expiringCode=this.props.expiringCode;
        let codeTypeNameList=['课程','特色课程','科学','主题课程','幼小衔接-拼音','幼小衔接-识字','幼小衔接-数学'];
        console.log(expiringCode);
        let duration = (parseInt(oneActInfo.expiry) - nowTime) / (60*60*24*1000);
        noticeTip = "您激活的"+(expiringCode.codeType ? codeTypeNameList[expiringCode.codeType] : '课程')+"还有"+ (parseInt(duration) + 1)+"天到期，请联系当地服务中心【"+expiringCode.dealerName+expiringCode.dealerTel+"】购买并激活！"
      }else{
        noticeTip = "您的课程使用权限即将到期，请联系当地服务中心【"+oneActInfo.dealerName+oneActInfo.dealerTel+"】进行续费！"
      }
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
      history.push('/scanCode');
      return;
    };
    //跳转至激活页面
    if(this.props.systemType==='actPlayClass' || this.props.systemType==='actPrimary' || this.props.systemType==='teachResourceRemind' || this.props.systemType === 'expiryTimeRemind'){
      let queryData=this.props.systemType==='actPlayClass' ? 'ts' :'yx';
      if(this.props.systemType==='actPlayClass'){
        queryData='ts'
      }else if(this.props.systemType==='actPrimary'){
        queryData='yx'
      }else if(this.props.systemType==='teachResourceRemind'){
        queryData='all'
      }else if(this.props.systemType === 'expiryTimeRemind'){
        queryData = this.props.codeType === 1 ? 'ts' :'all'
      };
      let path = {
        pathname:'/actCode_chose/'+queryData+'/0'
      };
      history.push(path);
      return;
    };
    // 关闭程序
    if(this.props.systemType==='systemFirm' || this.props.systemType==='errTimeRemind'){
      that.closeApp();
      return
    };
    // 确认激活
    if(this.props.systemType==='actCodeRemind'){
      this.actCode();
      return
    }
    if(this.props.systemType==='actCodeChangeRemind'){
      this.actCodeChange();
      return
    }
    if(this.props.systemType === 'expiringRemind'){
      this.timeRemindSureHandle();
      return
    }

    if(this.props.systemType === 'freeTrial'){
      this.freeTial();
      return
    }
  }

  // 激活码激活
  actCode=async ()=>{
    const that=this;
    const date=new Date();
    const params = this.props.actParams;
    console.log(params);
    try{
      let result =await API.requestNet('ActivateDeviceBatchReq',params,2);
      console.log(result);
      that.setState({
        btn_loading:false
      });
      if(result.status === 0){
        let actKey = storeAPI.getActiveKeyObj();
        let actKeyList = actKey ? actKey.codeList.concat(result.rsp.codeList): result.rsp.codeList;
        let codeType_new = [...new Set(actKeyList.map(x => {return x.codeType}))]; //定义新的激活码信息中包含的课程
        let term_new = [...new Set(actKeyList.map(x => {return x.term}))]; //定义新的激活码信息中包含的学期
        let actKeyList_new=[]; //定义新的激活码信息中的激活码列表
        console.log(actKeyList)
        // 遍历激活码，只返回每类课程每个学期的，激活码到期时间最远的激活码信息
        for(let i =0;i<codeType_new.length;i++){
          let net;
          for(let j =0;j<term_new.length;j++){
            net = actKeyList.filter(x=>{
              return x.codeType === codeType_new[i] && x.term===term_new[j]
            });
            console.log(net);
            function compare(property){
              return function(a,b){
                  var value1 = a[property];
                  var value2 = b[property];
                  return value2 - value1;
              }
            };
            net.sort(compare('expiry'));
            if(net[0]){
              actKeyList_new.push(net[0]);
            }
          }
        };
        console.log(actKeyList_new)
        // 激活信息中包含园所名称，园长手机号码，学期列表，课程列表，激活码列表
        let actKey_new={
          'tel':params.tel,
          'kindergartenName':params.kindergartenName,
          'term':codeType_new,
          'codeType':codeType_new,
          'codeList':actKeyList_new
        };
        storeAPI.setActiveKeyObj(actKey_new);

        // 获取系统时间，并在本地时间错误的时候修改本地电脑时间，容差范围为10分钟
        try{
          let xhr = null;
          if(window.XMLHttpRequest){
            xhr = new window.XMLHttpRequest();
          }else{ // ie
            xhr = new ActiveObject("Microsoft")
          };
          xhr.open("GET",netReqUrl,false)//false不可变
          xhr.send(null);
          let serverDate = xhr.getResponseHeader("Date");
          console.log(serverDate);
          if(Math.abs((new Date(serverDate).getMinutes() )- (new Date()).getMinutes()) > 10){
            platformAPI.setLocalTime(new Date(serverDate));
          };
        }catch(err){
          console.log(err)
        };
        // that.loadDataToLocal();
      }else{
        message.info(result.msg); //提示错误信息
      };
    }catch(err){
      console.log(err);
      that.setState({
        btn_loading:false
      });
      message.error(err + '');
    }
  }

  // 修改激活码
  actCodeChange=async ()=>{
    const that=this;
    const params = {
      codeMsg:this.props.actParams.codeList[0],
      changeType:1
    };
    console.log(params)
    try{
      let result =await API.macFixedRequest('CourseCodeChangeReq',params,that.props.actParams.mac);
      console.log(result);
      that.setState({
        btn_loading:false
      });
      if(result.status === 0){
        let actKey = storeAPI.getActiveKeyObj();
        let codeList = actKey ? actKey.codeList : [];
        let codeMsg=result.rsp.courseCodeMsg;
        console.log(codeMsg)
        console.log(codeList);
        let code_term = codeList.find(x=>{
          return x.codeType === codeMsg.codeType && x.term === codeMsg.term
        });
        let code_new = (code_term && code_term.expiry > codeMsg.expiry) ?  code_term : codeMsg;
        let codeList_new = codeList.filter(x=>{
          return x.code !== codeMsg.code && x !== code_term;
        });
        console.log(codeList_new)
        codeList_new.push(code_new);
        let codeType_new = [...new Set(codeList_new.map(x => {return x.codeType}))]; //定义新的激活码信息中包含的课程
        let term_new = [...new Set(codeList_new.map(x => {return x.term}))]; //定义新的激活码信息中包含的学期
        console.log(codeList_new)
        let actKey_new=Object.assign({},actKey,{
          'term':term_new,
          'codeType':codeType_new,
          'codeList':codeList_new
        });
        console.log(actKey_new)
        storeAPI.setActiveKeyObj(actKey_new);
        // that.loadDataToLocal();
      }else{
        message.info(result.msg); //提示错误信息
      }
    }catch(err){
      console.log(err);
      that.setState({
        btn_loading:false
      });
      message.error(err + '');
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
      let result=await API.requestNet(reqNetAdd,{isOpenTrial:true},2);
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
        that.props.onModalToggle(false);
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
    this.props.onModalToggle(false);
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

  // 激活成功后，下载数据至本地
  loadDataToLocal=async ()=>{
    const that=this;
    this.setState({
      loadingFlag:true
    });

    // setTimeout(()=>{
    //   history.push('/homePage')
    // },100000);

    try{
      // 主题课程激活码
      const zt_code_valid=this.props.actParams.codeList.filter(x=>{
        return x.codeType === 3
      }).map(val => {return val.term});

      // console.log(zt_code_valid)
      // 是否特色课程激活码，如果有，则下载特色课程所有数据
      if(this.props.actParams.codeList.map(x=>{return x.codeType}).includes(1)){
        API.downData((progress)=>{
          if(that._isMounted){
            if(progress === 'done'){
                console.log(progress)
                that.setState({
                  loadingFlag:false
                });
                history.push('/homePage');
            }else{
                that.setState({
                  loadData_progress:progress
                })
            }
          }
        })
        return;
        // let s =await API.getSpecialCourse(true);
      };

      // 判断是否下载主题课程数据
      if(zt_code_valid.length > 0){
        let zt_log = await API.getCourseFileLog(2);
        let zt = await API.getThemeCourse(zt_code_valid)
      };
      this.setState({
        loadingFlag:false
      });
      history.push('/homePage')
    }catch(err){
      console.log(err)
      history.push('/homePage')
    }

  }

  timeRemindSureHandle=()=>{
    let now=(new Date()).toLocaleDateString();
    cookie.setCookie('timeRemind_'+this.props.expiringCode.code+'',now,1);
    this.props.onModalToggle(false);
    if(this.props.expiringCode.path && this.props.expiringCode.path !== "prePrimary"){
      history.push(this.props.expiringCode.path);
    }else if(this.props.expiringCode.path ==="prePrimary"){
      platformAPI.openPrePrimary();
    }
  }

  timeRemindNotHandle=()=>{
    cookie.setCookie('nottimeRemind_'+this.props.expiringCode.code+'','1',30);
    this.props.onModalToggle(false);
    if(this.props.expiringCode.path && this.props.expiringCode.path !=="prePrimary"){
      history.push(this.props.expiringCode.path);
    }else if(this.props.expiringCode.path==="prePrimary"){
      platformAPI.openPrePrimary();
    }
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

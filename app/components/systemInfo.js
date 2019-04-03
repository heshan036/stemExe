import React , {Component} from 'react';
import { history } from '../store/configureStore.dev';
import {Button,Modal} from 'antd';
import Header from './header/header';
import cookie from '../cookie/cookie';
import styles from './systemInfo.css';
import {platformAPI} from '../api/platform_api';
import API from '../api/api';
import Util from '../api/util';
import {message} from 'antd/lib/index';
import fs from 'fs';
import path from 'path';
import {netReqUrl} from '../api/networkReq'
const {shell} = require('electron');
const remote=require('electron').remote;
const app=require('electron').remote.app;
import macAPI from '../api/macApi';
import storeAPI from '../api/storeAPI';
import { ipcRenderer, ipcMain} from 'electron';

const isOneAct = remote.getGlobal('globalDatas').isOneAct;
let oneActInfo = "";



class SystemInfo extends Component{
  constructor(props){
    super(props);
    oneActInfo = remote.getGlobal('globalDatas').oneActInfo;
    this.state={
      uneffetiveTime:'',
      macCode:storeAPI.get('realMac') ? storeAPI.get('realMac')  : storeAPI.getRealMac(),
      versionTxt:'当前已是最新版本',
      versionNum:app.getVersion(),
      updateVersionNum:app.getVersion(),
      lastesV:true,
      actInfoList:[],
      updataLoading:false,
      removeActiveMac:false,
      freeTrialData:'',
      fullMacArr : storeAPI.getObject('allMacs') ? storeAPI.getObject('allMacs') : storeAPI.getFullMacs(),
      macArr_sort:[]
    };
    console.log(new Set([1,1,1,2,2]))
    this.toActHandle=this.toActHandle.bind(this);
    this.superActHandle=this.superActHandle.bind(this);
    this.getMac=this.getMac.bind(this);
    this.checkUpdate=this.checkUpdate.bind(this);
    this.updateIpc=this.updateIpc.bind(this);
    this.versionClick=this.versionClick.bind(this);
  }

  componentWillMount(){
    const that=this;
    that.v_num=1;
    
    console.log(isOneAct)
    //获取当前时间
    try{
      that.nowDate=new Date(remote.getGlobal('globalDatas').loadTime);
      that.nowTime=that.nowDate.getTime();
    }catch(err){
      console.log(err)
    };
  }

  componentDidMount(){
    const that=this;
    let {fullMacArr,macCode}=this.state;
    fullMacArr.unshift(macCode);
    let macArr_sort = Array.from(new Set(fullMacArr));
    that.setState({
      macArr_sort
    })
    // console.log(new Set(macArr_temp))
    this.updateIpc();
    if(storeAPI.getObject('freeTrial')){
      try{
        let freeTrialInfo=storeAPI.getObject('freeTrial');
        if(freeTrialInfo.expiry > that.nowTime){
          let freeTrialData=Util.formatTimestamp(freeTrialInfo.expiry,'date',true);
          that.setState({
            freeTrialData
          })
        }
      }catch(err){
        console.log(err)
      }
    }

    this.getUpdate();
    
    if(!this.state.macCode){
      this.getMac()
    }
  }

  getUpdate=async()=>{
    const that=this;
    let {versionNum} = this.state;
    const updateInfo = await API.requestNet('CheckAPPUpdateReq', {versionCode:32 }, 3);
    console.log(updateInfo);
    if(updateInfo.rsp && updateInfo.rsp.versionName !=="AllBaseVsersion" && updateInfo.rsp.versionName !== versionNum){
      try{
        let V_old = versionNum.replace(/\./g,'');
        let V_new= updateInfo.rsp.versionName.replace(/\./g,'');
        if(parseInt(V_old) < parseInt(V_new)){ 
          that.setState({
            lastesV:false,
            versionTxt:'检测到新版本，是否立即更新',
            updateAppUrl:updateInfo.rsp.appUrl,
            updateVersionNum:updateInfo.rsp.versionName
          });
        };
      }catch(err){
        console.log(err)
      }
    }
  }

  checkUpdate(){
    const that=this;
    that.setState({
      updataLoading:true
    });
    ipcRenderer.send('updateAppUrl',that.state.updateAppUrl);
  }

  updateIpc(){
    const that=this;
    ipcRenderer.on('version-update',(event,{type,data}) => {
      console.log(type);
      console.log(data);
      if(type === 'error'){
        message.error('下载数据错误：' + data,3);
        return
      };
      if(type !== 'checking-for-update'){
        that.setState({
          updataLoading:false
        });
      };
      if(type === 'download-progress'){
        that.setState({
          updateProgress:parseFloat(data.percent).toFixed(1)
        })
      };
      if(type === 'isUpdateNow') {
        message.destroy();
        Modal.info({
          title:data,
          okText:'立即重启',
          onOk() {
            ipcRenderer.send('updateNow');
          },
        });
      }
    });
  }

  // 各类课程排序，按特色课程，主题课程，幼小衔接依此排序
  listSort=(property1,property2)=>{
    return function(a,b){
      const first = a[property1] - b[property1];
      if (first !== 0) {
        return first;
      };
      return a[property2] - b[property2];
    }
  }

  toActHandle(){
    let path = {
      pathname:'/actCode_chose/all/0'
    };
    history.push(path);
  }

  superActHandle(){
    let act_type=[{value:'super',name:'超级激活码'}]
    history.push('/actCode1/'+JSON.stringify(act_type)+'');
  }

  // 跳转选择课程，修改激活码
  toEditAct(codeKey){
    let actArr=[0,0,0,'zt','py','sz','sx'];
    let query={
      editFlag:'true',
      codeKey:codeKey
    };
    let path = {
      pathname:'/actCode_chose/'+actArr[codeKey.codeType]+'_'+codeKey.term+'/'+JSON.stringify(query)+''
    };
    history.push(path);
  }


  clearCookies(){
    cookie.clearCookies();
  }

  clearActKey(){
    storeAPI.clear()
  }

  getMac=async ()=>{
    const that = this;
    let macCode = await platformAPI.getIpconfiMac();
    console.log(macCode)
    if(macCode){
      that.setState({
        macCode
      })
    }
  }

  // 点击版本号10下出现清除mac
  versionClick(){
    this.v_num ++ ;
    if(this.v_num === 10){
      this.setState({
        removeActiveMac:true
      })
    }
  }

  render(){
    const that=this;
    const {removeActiveMac,freeTrialData,macCode,fullMacArr,macArr_sort}=this.state;
    const ActiveStatus = ()=>{
      switch(oneActInfo.activateStatus){
        case 2 :
          if(oneActInfo.expiry > that.nowTime){
            return <li>服务有效期至: {Util.formatTimestamp(oneActInfo.expiry,'date',true)}</li> 
          }else{
            return <li className="c_red">服务已过期</li>  
          };
        case 0:
          return <li>未激活状态</li> ;
        case 1:
          return <li>已提交申请，等待【{oneActInfo.dealerName + oneActInfo.dealerTel}】审核</li> ;
        case 3:
          return <li>您的激活申请未通过，如有疑问，请联系【{oneActInfo.dealerName + oneActInfo.dealerTel}】</li> ;
        default:
          return <li>您的激活信息已被撤销，如有疑问，请联系【{oneActInfo.dealerName + oneActInfo.dealerTel}】</li> ;
      }
    };
    return (
      <div style={{overflowY:'auto  '}}>
        <Header homeIconFlag={false}>
          <span className="pr" style={{display: "inline-block"}}>
            <img src='./resource/images/logo.png'/>
            <b>V {this.state.versionNum}</b>
          </span>
        </Header>
        <div className={styles.main_con}>
          <div className={styles.main_part}>
            <p style={{textIndent:"2em"}}>
            《中华优秀传统文化教育资源》是以《3--6岁儿童学习与发展指南》和教育部印发的《完善中华优秀传统文化教育指导纲要》为指导，以幼儿身心发展规律为基础，以弘扬爱国主义精神为核心，以家国情怀教育、社会关爱教育和人格修养教育为重点，为幼儿量身打造的一套传统文化与高科技相渗透、经典故事与操作游戏相结合的教育资源。它汇集了国内优秀幼儿教育专家团队，精选104个传统文化主题，包含208个操作游戏，恰当融入AR技术，更直观地彰显传统文化的光辉灿烂，让幼儿全方位感受中华传统文化的魅力。
            </p>
            <p>
            云宝贝官网地址：
            <a
            className="c_blueLight"
            onClick={()=>shell.openExternal('http://www.yunbaobei.com')
            }>http://www.yunbaobei.com/ </a><br/>
            客服QQ：<a
            className="c_blueLight"
            onClick={()=>shell.openExternal('http://wpa.qq.com/msgrd?v=3&uin=800151633&site=qq&menu=yes')
            }>800151633</a>
            {/* <br/>客服电话: 400-661-6600 */}
            </p>
          </div>
          <div className={styles.main_part}>
            <div className={styles.main_flexPart}>
              {isOneAct ?
                <ul>
                  {freeTrialData && <li>七天免费体验到期时间：{freeTrialData}</li>}
                  <ActiveStatus/>
                  <li>
                    <span>MAC地址列表：</span>
                    <ul className="inlineBlock vt">
                      {
                        macArr_sort.map(item=>{
                          return <li key={item}>{item}</li>
                        })
                      }
                    </ul>
                  </li>
                </ul>
                :
                <ul>
                   <li>MAC地址：{this.state.actInfoList.length > 0 ? this.state.actInfoList[0].mac : this.state.macCode}</li>
                   {freeTrialData && <li>免费体验到期时间：{freeTrialData}</li>}
                  <li className={styles.actInfo}>
                    {/* <span>激活码信息：</span> */}
                    {this.state.actInfoList ? <ul>
                      {this.state.actInfoList.map((x,index)=>{
                        return (<li key={index}>
                          {x.name}：有效期 {x.effectiveDate} 至 {x.expiryDate}
                          {(x.playNum < 11 && x.modCnt > 0 && x.codeType !== 1) &&
                            <a className="ml10" onClick={()=>this.toEditAct(x)}><i className="iconfont icon-pen_ mr5"></i>修改</a>
                          }
                        </li>)
                      })}
                    </ul> : '您尚未激活任何课程'}
                  </li>
                </ul>
              }
              <div>
                {!isOneAct &&
                  <p><Button type="primary" className="btn_inline" onClick={this.toActHandle}>手动激活</Button></p>
                }
                <p><Button type="primary" className="btn_inline" onClick={()=>{
                  history.push('/scanCode')
                }}>扫码激活</Button></p>
                {!isOneAct &&
                  <p><Button type="primary" className="btn_inline" onClick={this.superActHandle}>超级激活</Button></p>
                }
              </div>
            </div>
          </div>
          <div className={styles.main_part}>
            <div className={styles.main_flexPart}>
              <ul>
                <li>{this.state.versionTxt} <span className="c_blueLight" onClick={this.versionClick}>V {this.state.updateVersionNum}</span></li>
              </ul>
              {!that.state.updateProgress ?
                <Button type="primary" className="btn_inline" onClick={()=>this.checkUpdate()} disabled={this.state.lastesV} loading={this.state.updataLoading}>
                立即更新
                </Button>: <span>已下载：{that.state.updateProgress}%</span>}
            </div>
          </div>
          <div className={styles.main_part} style={{display:removeActiveMac ? 'block' : 'none'}} >
            <div className={styles.main_flexPart} >
              <ul>
                <li>清除激活mac地址</li>
              </ul>
              <Button type="primary" className="btn_inline" onClick={()=>storeAPI.remove('actMacArr_' + netReqUrl)}>清除</Button>
            </div>
          </div>
          {/* <div className={styles.main_part}>
            <div className={styles.main_flexPart}>
              <ul>
                <li>清除本地缓存</li>
              </ul>
              <Button type="primary" className="btn_inline" onClick={this.clearCookies}>清除缓存</Button>
            </div>
          </div> */}
        </div>
      </div>
    )
  }
}

export default SystemInfo;

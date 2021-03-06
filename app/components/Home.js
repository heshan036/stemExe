// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {Row,Col ,Icon,Modal,message,Button} from 'antd';
import {remote ,ipcRenderer,ipcMain,shell} from 'electron';
import { history } from '../store/configureStore';
import API from '../api/api';
import {platformAPI} from '../api/platform_api';
import storeAPI from '../api/storeAPI';
import macAPI from '../api/macApi';
import SystemModal from './systemModal';
import MainPopups from './popups/popups';
import styles from './Home.css';
import cookie from '../cookie/cookie';
import Util from '../api/util';
import {netReqUrl} from '../api/networkReq';

let oneActInfo = ""; //一次激活信息
let oneActUseFlag = false; //一次激活，是否可用
let onActExpiryFlag = false; //一次激活，是否到期

class Home extends Component{
    constructor(props){
        super(props);
        this.state={
            freeTialFlag:storeAPI.getObject('freeTrial') ? true : false,
        }
        this.setStateValue = this.setStateValue.bind(this);
        this.setModalState = this.setModalState.bind(this);
        this.toStemCourse = this.toStemCourse.bind(this)
    };

    componentWillMount(){
        const that=this;
        oneActInfo = remote.getGlobal('globalDatas').oneActInfo;
        //拿到程序启动时候的时间，有可能时接口返回时间，有可能时没网时的本地时间
        that.nowDate=new Date(remote.getGlobal('globalDatas').loadTime);
        that.nowTime=that.nowDate.getTime();
        if(oneActInfo.activateStatus === 2 && parseInt(oneActInfo.expiry) > that.nowTime ){
            oneActUseFlag = true;
        }
    }

    componentDidMount(){
        const that=this;
        if(oneActInfo.activateStatus !== 2){
            this.freeTialHandle()
            return;
        };
        that.expiryRemind();
        let duration = oneActInfo.expiry ? parseInt(oneActInfo.expiry) - that.nowTime : -1;
        if(duration < 0){
            onActExpiryFlag = true;
            that.setModalState('expiryTimeRemind')
            this.freeTialHandle();
            return;
        };

        oneActUseFlag = true;

        // 如果有网络，则下载主题课程数据
        if(navigator.onLine && remote.getGlobal('globalDatas').loadFlag === 0 ){
            try{
              API.getThemeCourse([1,2,3,4,5,6]);
              API.getCourseFileLog(2);
            }catch(err){
              console.log(err)
            }
        }

        // 'globalDatas'为判断是否为loading页面跳转，如果是值为1，则判断时从loading来，避免每次进入首页都要运行此方法
        if(remote.getGlobal('globalDatas').loadFlag === 1){
            that.LoadingFromUpdate();
        };
    }

    componentWillUnmount(){
        this.setState({
            formModalVisible:false
        });
    }

     // 启动时要拿下的数据
    LoadingFromUpdate(){
        const that=this;
        console.log('LoadingFromUpdate');

        //判断是否携带版本更新信息
        if(remote.getGlobal('globalDatas').updateAppInfo){
            const updateAppInfo=remote.getGlobal('globalDatas').updateAppInfo;
            that.setState({
                updateDesc:updateAppInfo.desc,
                modalVisible:true,
                modalWith:540,
                modalTitle:'发现新版本' + updateAppInfo.versionName,
                updateAppUrl:updateAppInfo.appUrl,
                updateVersion:updateAppInfo.versionName,
            })
        }

        // 无取消体验期点击记录，无体验期记录，则自动弹窗提醒
        if(!storeAPI.get('freeTrialConcel') && !storeAPI.getObject('freeTrial') && !oneActUseFlag){
            //如果是新管控，并且还在有效期内，则不主动弹窗体验
            that.setModalState('freeTrial')
        };
              
        // 校验电脑时间
        let errTime = that.checkWindowTime();
        
        if(errTime){
            return
        }
        
        //弹出30天倒计时提醒
        that.expiryRemind();

        // 重新获取一遍mac地址
        platformAPI.getIpconfiMac();

        //解除锁机
        platformAPI.removeProtection();

        // 将'loadFlag'的状态变为0
        remote.getGlobal('globalDatas').loadFlag = 0;

    }

    // 体验激活判断
    freeTialHandle(){
        const that=this;
        //有体验期记录，再进行有效期判断
        let freeTrialInfo=storeAPI.getObject('freeTrial');
        if(!freeTrialInfo || freeTrialInfo.expiry < that.nowTime){
            return;
        };
        oneActUseFlag=true;
    }

    // 校验当前电脑时间是否正确
    checkWindowTime=()=>{
        const that=this;
        if(navigator.onLine && remote.getGlobal('globalDatas').netWork){ //没有网络的话
            storeAPI.setCheckinDate();//保存当前本地时间为系统时间
            return
        }else{
            let systemDate = storeAPI.getCheckinDate();
            console.log(new Date(systemDate))
            //校验失效时间大于当前时间，则验证上次保存的系统启动时间与本地时间的大小，如果系统时间小，则弹出时间调整框
            if(systemDate && (new Date()).getTime() < systemDate){
                that.setModalState('errTimeRemind');
                return true
            }else{
                storeAPI.setCheckinDate();//保存当前本地时间为系统时间
                return
            }
        }

    }

    //弹出30天倒计时提醒
    expiryRemind=async (codeType,path='')=>{
        const that=this;
        let duration = parseInt(oneActInfo.expiry) - that.nowTime;
        let expiringCode = (duration <= 30*24*60*60*1000 && duration > 0) ? oneActInfo : null;
        if(!expiringCode){
             return
        };
        let nottimeRemind = await cookie.getCookie('nottimeRemind');
        if(nottimeRemind === '1'){
            return;
        };
        let nowDay=(new Date()).toLocaleDateString();
        let timeRemind=await cookie.getCookie('timeRemind');
        if(timeRemind === nowDay){
             return;
        };

        console.log(expiringCode)
        expiringCode.path=path;
        that.expiringCode = expiringCode;
        that.setModalState('expiringRemind')
        return expiringCode;
    }

    // 点击在线更新立即更新按钮
    updateHandle(){
        storeAPI.set('update_'+this.state.updateVersion,'1')
        ipcRenderer.send('updateAppUrl',this.state.updateAppUrl);
        history.push('/systemInfo')
    }

    toStemCourse(categary){
        const that = this;
        if(oneActUseFlag){
            history.push('/stemCourse/'+categary+'')
        }else{
            if(onActExpiryFlag){
                that.setModalState('expiryTimeRemind')
            }else{
                that.setModalState('actCourse')
            }
        }
    }
    
    // 改变state
    setStateValue(feild,value){
        this.setState({
          [feild]:value
        })
    }
    
    setModalState(value){
        this.formMolalType=value;
        this.systemType=value;
        this.setStateValue('formModalVisible',true)
    }

    render(){
        const that = this;
        const {freeTialFlag} = this.state;
        return(
            <div className={styles.home_wrapper}>
                <img src='./resource/images/home_bg2.png' className={styles.home_img1}/>
                <div className={styles.contact}>
                    <p onClick={()=>shell.openExternal('http://wpa.qq.com/msgrd?v=3&uin=800151633&site=qq&menu=yes')}>
                        <img src="./resource/images/qq.png"/><br/>
                        <span>QQ在线咨询</span>
                    </p>
                    <p>
                        <img src="./resource/images/wx.png"/><br/>
                        <span>关注我们</span>
                    </p>
                </div>
                {!freeTialFlag &&
                    <img src='./resource/images/freeTrial.png' className={styles.home_freeTial_remind} onClick={()=>{
                        that.setModalState('freeTrial')
                    }}/>
                }
                <header className={styles.homeHeader}>
                    <div className={styles.header_l} style={{cursor:that.state.netStatus ? 'pointer':'default'}}>
                        <img src="./resource/images/logo.png" alt="logo"/>
                    </div>
                    <div className={styles.header_r}>
                        <Link to="/systemInfo" className={styles.menu_link}><img src="./resource/images/home_setting.png" alt="设置"/></Link>
                        <span onClick={()=>ipcRenderer.send('hide-window')}><i className="iconfont icon-jian" style={{fontSize:'2.2vw'}}></i></span>
                        <span onClick={()=>{
                            that.setModalState('systemFirm')
                        }}>
                            <i className="iconfont icon-cha"></i>
                        </span>
                    </div>
                </header>
                <div className={styles.home_con}>
                    <Row type="flex" justify="space-between">
                        <Col span={7} className={styles.home_navBox}>
                            <div className={styles.home_nav} onClick={()=>this.toStemCourse(1)}>
                                <img className={styles.home_nav_img} src="./resource/images/home_xs.png" alt="小班上级"/>
                                <span>第一级(小上)</span>
                            </div>
                            <div className={styles.home_nav} onClick={()=>this.toStemCourse(2)}>
                                <img className={styles.home_nav_img} src="./resource/images/home_xx.png" alt="小班下级"/>
                                <span>第二级(小下)</span>
                            </div>
                        </Col>
                        <Col span={7} offset={1} className={styles.home_navBox}>
                            <div className={styles.home_nav} onClick={()=>this.toStemCourse(3)}>
                                <img className={styles.home_nav_img} src="./resource/images/home_zs.png" alt="中班上级"/>
                                <span>第三级(中上)</span>
                            </div>
                            <div className={styles.home_nav} onClick={()=>this.toStemCourse(4)}>
                                <img className={styles.home_nav_img} src="./resource/images/home_zx.png" alt="中班下级"/>
                                <span>第四级(中下)</span>
                            </div>
                        </Col>
                        <Col span={7} offset={1} className={styles.home_navBox}>
                            <div className={styles.home_nav} onClick={()=>this.toStemCourse(5)}>
                                <img className={styles.home_nav_img} src="./resource/images/home_ds.png" alt="大班上级"/>
                                <span>第五级(大上)</span>
                            </div>
                            <div className={styles.home_nav} onClick={()=>this.toStemCourse(6)}>
                                <img className={styles.home_nav_img} src="./resource/images/home_dx.png" alt="大班下级"/>
                                <span>第六级(大下)</span>
                            </div>
                        </Col>
                    </Row>
                </div>
                <MainPopups
                formModalVisible={this.state.formModalVisible}
                setStateValue={this.setStateValue}
                modalType={this.formMolalType}>
                {this.formMolalType === "errTimeRemind" && <SystemModal setStateValue={that.setStateValue} systemType={that.systemType}></SystemModal>}
                {this.formMolalType === "freeTrial" && <SystemModal setStateValue={that.setStateValue} systemType={that.systemType} freeTialHandle={that.freeTialHandle} setStateValue={that.setStateValue}></SystemModal>}
                {this.formMolalType === "systemFirm" && <SystemModal setStateValue={that.setStateValue} systemType={that.systemType}></SystemModal>}
                {this.formMolalType === "expiryTimeRemind" && <SystemModal setStateValue={that.setStateValue} systemType={that.systemType} codeType ={that.codeType_remind}></SystemModal>}
                {this.formMolalType === "expiringRemind" && <SystemModal setStateValue={that.setStateValue} systemType={that.systemType} expiringCode ={that.expiringCode}></SystemModal>}
                {this.formMolalType === "actCourse" && <SystemModal setStateValue={that.setStateValue} systemType={that.systemType}></SystemModal>}
                </MainPopups>
                    {/* 更新提示 */}
                <Modal
                    visible={that.state.modalVisible}
                    width={that.state.modalWith}
                    title={that.state.modalTitle}
                    wrapClassName='updateNotice'
                    okText='立即更新'
                    cancelText='下次再说'
                    onOk={()=>{
                    that.updateHandle()
                    }}
                    onCancel={()=>{
                        storeAPI.set('update_'+this.state.updateVersion,'1')
                        that.setState({
                        modalVisible:false
                        })
                    }}
                >
                <div>
                    <img src="./resource/images/rocket.png" className="rocketImg"/>
                    <p style={{whiteSpace:"normal"}}>{that.state.updateDesc}</p>
                </div>
                </Modal>
            </div>
        )
    }
}

export default Home
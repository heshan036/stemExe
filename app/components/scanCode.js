import React , {Component} from 'react';
import { history } from '../store/configureStore.dev';
import {Button,Modal,message} from 'antd';
import PropTypes from 'prop-types';
import Header from './header/header';
import styles from './systemInfo.css';
import {platformAPI} from '../api/platform_api';
import API from '../api/api';
import fs from 'fs';
import path from 'path';
import {netReqUrl} from '../api/networkReq';
import QRCode from 'qrcode.react';
import { ipcRenderer, ipcMain,remote} from 'electron';
import macAPI from '../api/macApi';
import storeAPI from '../api/storeAPI';
const confirm = Modal.confirm;

const isOneAct = remote.getGlobal('globalDatas').isOneAct;

class ScanCode extends Component{
    constructor(props){
        super(props);
        this.state={
            loadingFlag:false,
            loadData_progress:0,
            mac:storeAPI.get('realMac') ? storeAPI.get('realMac')  : storeAPI.getRealMac(),
            qrcodeUrl:'',
        };
        this.actKeyUpdate=this.actKeyUpdate.bind(this);
        this.batchKeysFun = this.batchKeysFun.bind(this);
    }

    componentWillMount(){
        const that=this;
        that._isMounted=true
    }

    componentWillUnmount(){
        this._isMounted=false
    }

    componentDidMount(){
        const that=this;
        const {mac} = this.state;
        // mac地址激活扫码地址
        let qrcodeUrl = "http://h5.yunbaobei.com/box/box.do?boxCode="+mac+"&type=1";
        //一次激活，扫码地址，测试和正式,type为55时为主题课程传统文化
        let oneActTest = "http://wp.test.yunbaobei.com/wechat/action.do?action=scanBoxAct&needLogin=false&type=55&machineCode="+mac+"";
        let oneAct = "http://wp.yunbaobei.com/wechat/action.do?action=scanBoxAct&needLogin=false&type=55&machineCode="+mac+"";
        if(isOneAct){
            qrcodeUrl = oneAct;
        };
        this.setState({
            qrcodeUrl
        })
    }

    // 重新获取全部激活码信息
    actKeyUpdate=async ()=>{
        const that=this;
        if(!navigator.onLine){
            message.error('当前网络不可用,请检查网络设置',2);
            return
        };
        message.loading('正在获取激活信息',0);
        try{
            let deviceID = that.state.mac;
            let reqNetAdd = isOneAct ? 'CheckDeviceReq' : "CheckKeyBatchReq";
            let params_oneAct = {
                fifthGeneration:true,
                networkCardList:storeAPI.getObject('allMacs') ? storeAPI.getObject('allMacs') : storeAPI.getFullMacs(),
            };
            let params = isOneAct ? params_oneAct : {};
            let result = await API.macFixedRequest(reqNetAdd,params,deviceID);
            console.log(result);
            if(result.status!== 0){
                message.error(result.msg,2);
                return
            };
            message.destroy();
            if(isOneAct){
                if(result.rsp.trialMsg){
                    storeAPI.setObject('freeTrial',result.rsp.trialMsg);
                    delete result.rsp.trialMsg;
                }else{
                    storeAPI.remove('freeTrial')
                };
                remote.getGlobal('globalDatas').oneActInfo = result.rsp;
                storeAPI.setObject('oneActInfo',result.rsp);
                if(result.rsp.activateStatus !== 2){
                    message.info('未找到激活记录');
                    return
                };
                message.success('激活成功',2,()=>{
                    history.goBack();
                });
            }else{
                that.batchKeysFun(deviceID,result)
            };
        }catch(err){
            console.log(err);
            message.destroy();
            if(err === '网络请求超时，请稍后再试~'){
                message.error('获取激活信息失败，请重试');
                return
            };
            message.error(err + '');
        }
    }
    
    // 多课程激活获取信息
    batchKeysFun = (mac,result)=>{
        const that = this;
        let actKey_obj = storeAPI.getActiveKeyObj();
        actKey_obj = actKey_obj ? actKey_obj : {};
        console.log(result);
        if(result.status!== 0){
            message.error(result.msg,2);
            return
        }
        // 保存激活码，机制与激活相同
        let actKeyList = actKey_obj.codeList ? actKey_obj.codeList.concat(result.rsp.codeList): result.rsp.codeList;;
        let codeType_new = [...new Set(actKeyList.map(x => {return x.codeType}))]; //定义新的激活码信息中包含的课程
        let term_new = [...new Set(actKeyList.map(x => {return x.term}))]; //定义新的激活码信息中包含的学期
        let actKeyList_new=[]; //定义新的激活码信息中的激活码列表
        // 遍历激活码，只返回每类课程每个学期的，激活码到期时间最远的激活码信息
        for(let i =0;i<codeType_new.length;i++){
            let net;
            for(let j =0;j<term_new.length;j++){
                net = actKeyList.filter(x=>{
                    return x.codeType === codeType_new[i] && x.term===term_new[j]
                });
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
        //合并激活信息
        actKey_obj=Object.assign({},actKey_obj,{
            'term':term_new,
            'codeType':codeType_new,
            'codeList':actKeyList_new
        });
    
        storeAPI.setActiveKeyObj(actKey_obj);
        storeAPI.addActivedMac(mac);
        history.goBack()
    }

     // 激活成功后，下载数据至本地
    loadDataToLocal=async ()=>{
        const that=this;
        this.setState({
            loadingFlag:true
        });
        if( fs.existsSync(path.join(platformAPI.txtBasePath,'themeCourse_stem.json'))){
            return
        };
        API.downData((progress)=>{
            if(that._isMounted){
                if(progress === 'done'){
                    console.log(progress)
                    that.setState({
                        loadingFlag:false
                    });
                    history.push('/SystemInfo');
                }else{
                    that.setState({
                        loadData_progress:progress
                    })
                }
            }
        });

    }

    render(){
        const that=this;
        const {mac,qrcodeUrl,loadingFlag,loadData_progress}=this.state;
        return(
            <div>
                <Header homeIconFlag={false}>
                    {/* <span className="pr" style={{display: "inline-block"}}> */}
                        欢迎使用长征五代智慧课堂教学系统
                    {/* </span> */}
                </Header>
                <div className={styles.scanContent}>
                    <p className="tc mb2 fvw30">请扫描下方二维码，并根据提示进行激活，激活完成后请在联网状态下点击“激活完成”或重启云宝贝。</p>
                    <div className={styles.qrcodeBox}>
                        <QRCode value={qrcodeUrl} size={176} className={styles.qrcode}/>
                    </div>
                    <p className="tc mt1">
                        <Button type="primary" className="btn_inline" onClick={this.actKeyUpdate}>激活完成</Button>
                    </p>
                </div>
                <span className="fvw30" style={{bottom:'2vh',right:'2vw',position:'fixed'}}>MAC地址：{mac}</span>
                {loadingFlag &&
                    <div className={styles.loadingData}>
                        <div className={styles.loading}>
                            <img src="./resource/images/loading2.gif"/>
                            {parseInt(loadData_progress) !== 0 && <p>已下载：{loadData_progress}%</p>}
                            <p>激活成功，正在下载数据，请保持网络通畅!</p>
                        </div>
                    </div>
                }
            </div>
        )
    }
}

export default ScanCode;

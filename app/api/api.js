import Server from './server';
import cookie from '../cookie/cookie';
import { remote } from 'electron';
import {platformAPI} from './platform_api';
import {netReqUrl} from '../api/networkReq';
import fs from 'fs';
import path from 'path';
import storeAPI from '../api/storeAPI';

const token_default='74df34c98179d74cb77fc3a1cf1ca1afcb74cb887eb4d3c61a3ede1b9c8884d1583ecd0b087a2667c82e633cdf85bb17dd0f86d79b7c1d3a95d868fadb3bbd7f1dd9a535323b42d133e5c593bde689dfeced4e670a7243c614f7aff0a14b171b43e53715e002bdfd2088bbd563baa958617db9d475953dd6c55cc3392abd9bf4';
const userId_default=67775;
const isOneAct = remote.getGlobal('globalDatas').isOneAct;
let macAdress = storeAPI.get('realMac') ? storeAPI.get('realMac')  : storeAPI.getRealMac();  //真实物理mac地址
let deviceID = macAdress;

class API extends Server {
  // 登录
  async login(params = {}) {
    try {
      const _option = {
        header: {
          appId: '8',
          version: '10',
          device: {
            mac: deviceID
          }
        },
        reqName: 'JsLoginReq',
        params
      };
      let userNameArr_new = '';
      const result = await this.axios('POST', _option);
      console.log(result);
      if (result) {
        const value = await cookie.getCookie('userNameArr');
        if (value === 0) {
          userNameArr_new = params.userName;
        } else {
          if(!value.includes(params.userName)){
            userNameArr_new = `${value},${params.userName}`;
          }else{
            userNameArr_new=value;
          }
        };
        cookie.setCookie('userNameArr', userNameArr_new, 365);
        return result;
      };
      const err = {
        tip: '登录失败',
        response: result,
        data: params
      };
      throw err;
    } catch (err) {
      throw err;
    }
  }

 async requestNet(reqName, params = {}, reqHeaderFlag,cb) {
    const that=this;
    let reqHeaderTag;
    if (reqHeaderFlag === 2) {
      reqHeaderTag ={
        device: {
          mac: deviceID
        }
      }
    }else if (reqHeaderFlag === 3) {
      let user = storeAPI.getUser();
      reqHeaderTag =Object.assign({},reqHeaderTag,{
        client:{"channel":"official"},
        device: {
          mac: deviceID
        },
        token:user ? user.token :  token_default,
        userId: user ? user.loginUserId :  userId_default
      })
    }else{
      let user = storeAPI.getUser();
      reqHeaderTag = {
        token:user ? user.token :  token_default,
        userId: user ? user.loginUserId :  userId_default
      };
    };
    if(reqHeaderFlag === 4){ //教学资源直播课外appId用6
      var reqHeader = Object.assign({}, reqHeaderTag, { appId: '6', version: '10' });
    }else{
      var reqHeader = Object.assign({}, reqHeaderTag, { appId: '8', version: '10' });
    }
    const _option = {
      header: reqHeader,
      reqName,
      params
    };
    try {
      const result = await that.axios('POST', _option);
      if(result) {
        if(cb){
          typeof cb === 'function' && cb(result);
        }else{
          return result
        };
        if((reqName === 'ActivateDeviceBatchReq' || reqName ==='ActivateDeviceSuperReq') && result.status === 0 && !isOneAct){
          storeAPI.addActivedMac(macAdress)
        }
      }
    }catch (err) {
      console.log(err)
      if(cb){
        typeof cb === 'function' && cb(err);
      }else{
        throw err;
        // return err
      }
    }
  }

  async macFixedRequest(reqName, params = {},deviceNo,cb){
    const that=this;
    const _option = {
      header: {
        appId: '8',
        version: '10' ,
        device: {
          mac: deviceNo
        }
      },
      reqName,
      params
    };
    console.log(_option)
    try {
      const result = await that.axios('POST', _option,cb);
      if(result) {
        if(cb){
          typeof cb === 'function' && cb(result);
        }else{
          return result
        };
      }
    }catch (err) {
      if(cb){
        typeof cb === 'function' && cb('error');
      }else{
        throw err;
      };
    }
  }

  //主题课程,act_term_valid为激活学期，只有激活的学期才下载相应的课件封面图
  getThemeCourse=(act_term_valid=[])=>{
    const that=this;
    let baseNetUrl=platformAPI.baseNetUrl;
    return new Promise((resolve,reject)=>{
      let reqParams = {
        'term':0,
        'picType':4,
        'resType':3,
        'themeSifting':'TRADITIONAL'
      }
      try{
        that.requestNet('GetThemeCourseListReq',reqParams,1,async (res)=>{
          console.log(res)
          if(!res.rsp){
            reject(res)
          };
          let themeCourseRSP=res.rsp ? res.rsp :'' ;
          let sum=themeCourseRSP.courseList ? themeCourseRSP.courseList.length :0;
          if(sum > 0){
            for(let [index,item] of themeCourseRSP.courseList.entries()){
              if(act_term_valid.includes(item.term)){
                let coverUrl=themeCourseRSP.courseListIterator[index].coverUrl.startsWith('http') ? themeCourseRSP.courseListIterator[index].coverUrl : baseNetUrl+themeCourseRSP.courseListIterator[index].coverUrl;
                if(item.coverUrl !== '' && !fs.existsSync(path.join(platformAPI.imgBasePath,coverUrl))){
                  item.coverUrl=await platformAPI.downloadImg(coverUrl,'uploadImages');
                };
              }
            };
            const t = await platformAPI.createFile('localData','themeCourse_stem.json',JSON.stringify(themeCourseRSP));
            console.log(themeCourseRSP);
            resolve(themeCourseRSP)
          }else{
            resolve(themeCourseRSP)
          }
        });
      }catch(err){
        console.log(err)
        reject(error)
      }
    })
  }
  
  getCourseFileLog=(courseType)=>{
    const that=this;
    return new Promise(resolve=>{
      let params={
        "courseId":0,
        "platType":2,
        "genType":5,
        "courseType":courseType
      };
      try{
        that.requestNet('GetCourseFileLogReq',params,0,async (res)=>{
          console.log(res);
          if(res.status === 0){
            const t=await platformAPI.createFile('localData','courseFileLog_'+courseType+'.json',JSON.stringify(res.rsp))
            resolve(res.rsp.logList)
          }else{
            resolve(0)
          }
        })
      }catch(err){
        reject(res)
      }
    })
  }

  // 下载数据
  downData=(cb)=>{
    let filePath=path.join(platformAPI.fileBasePath,'ybb_data');
    platformAPI.downloadResource('data','https://qncdn.yunbaobei.com/ybb_data.zip','',function(err,done,progress){
      console.log(progress);
      console.log(done)
      if(done){
        typeof cb === 'function' && cb('done')
      };
      if(progress){
        typeof cb === 'function' && cb(progress)
      };
    },true)
  }

}

export default new API();

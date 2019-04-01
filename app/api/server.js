import axios from 'axios';
import cookie from '../cookie/cookie';
import {netReqUrl} from './networkReq';
import {message} from 'antd';
import {remote} from 'electron';
/**
 * 主要params参数
 * @params method {string} 方法名
 * @params url {string} 请求地址  例如：/login 配合baseURL组成完整请求地址
 * @params baseURL {string} 请求地址统一前缀 ***需要提前指定***  例如：http://cangdu.org
 * @params timeout {number} 请求超时时间 默认 30000
 * @params params {object}  get方式传参key值
 * @params headers {string} 指定请求头信息
 * @params withCredentials {boolean} 请求是否携带本地cookies信息默认开启
 * @params validateStatus {func} 默认判断请求成功的范围 200 - 300
 * 其他更多拓展参看axios文档后 自行拓展
 * 注意：params中的数据会覆盖method url 参数，所以如果指定了这2个参数则不需要在params中带入
**/

export default class Server  {
    axios(method, params){
        return new Promise((resolve, reject) => {
          if(typeof params !== 'object') params = {};
          let _option = params;
          _option = {
            method,
            url:netReqUrl,
            timeout: 30000,
            params: null,
            data: {
              ...params
            },
            headers:{
              'Accept': 'application/json',
              'content-type': 'application/json'
            },
            // withCredentials: false, //是否携带cookies发起请求
            validateStatus:(status)=>{
                return status >= 200 && status < 300;
            }
          };
          console.log(_option);
          axios.request(_option).then(res => {
            console.log(res);
            remote.getGlobal('globalDatas').netWork = true;
            if(res.status === 200){
              localStorage.setItem('systemDate',res.headers.date);
              // cookie.setCookie('systemDate',res.headers.date,365)
            };
            try{
              if(typeof res.data === 'object'){
                resolve(res.data)
              }else{
                try{
                  let t=JSON.parse(res.data);
                  if(t){
                    resolve(t)
                  }
                }catch(err){
                  throw err
                }
              }
              // resolve(typeof res.data === 'object' ? res.data : JSON.parse(res.data))
            }catch(err){
              throw err
            }
          },error => {
            console.log(error);
            platformAPI.createFile('localData','errRequest'+params.reqName ? params.reqName : ''+'.json',JSON.stringify(error));
            let str = error + '';
            remote.getGlobal('globalDatas').netWork = false;
            if(str.search('timeout') > -1){
              reject('网络请求超时，请稍后再试~')
            }else{
              reject('当前网络不可用，请检查您的网络设置')
            };
          })
        })
    }
}

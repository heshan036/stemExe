// import { resolve } from 'path';
import {netReqUrl} from '../api/networkReq';

let __session =  require('electron').session;
if (__session == undefined){
  __session = require('electron').remote.session;
}
const session = __session;

const url=netReqUrl;
const domain="appapitest.yunbaobei.com";


class Cookie {
  /**
 * 获得getCookie
 */

  async getCookies(){
    return new Promise(resolve=>{
      session.defaultSession.cookies.get({url:url}, function (error, cookies) {
        console.log(cookies)
        if (!error && cookies.length > 0) {
          resolve(cookies)
        }
      });
    })
  }

/**
 * 获得getCookies
 */
  async getCookie(name,path='/'){
    return new Promise(resolve=>{
      const cookie = {
        url: url,
        name: name,
        path:path
      };
      session.defaultSession.cookies.get(cookie, function (error, cookies) {
        if(!error && cookies.length > 0){
           resolve(cookies[0].value)
         }else{
           resolve(0)
         }
      });
    })
  }

  async setCookie(name, value,day=30,path='/'){
    let exp = new Date();
    let date = Math.round(exp.getTime() / 1000) + day * 24 * 60 * 60;
    const cookie = {
      url: url,
      name: name,
      value: value,
      path:path,
      expirationDate: date
    };
    session.defaultSession.cookies.set(cookie, (error) => {
      if (error) console.error(error);
      console.log(cookie)
    });
  }

 clearCookies(storages=['cookies']){
    session.defaultSession.clearStorageData({
      origin: url,
      storages: storages
    }, function (error) {
      if (error) console.error(error);
    })
  }


  removeCookie(name){
    session.defaultSession.cookies.remove(url,name,(error) => {
      if (error) console.error(error);
    });
  }
}

export default new Cookie()


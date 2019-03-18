const {netReqUrl} =require('./networkReq') ;
var LocalStorage = require('node-localstorage').LocalStorage;
var store = new LocalStorage('D:\\Program Files\\ChangZhengEDU\\stemStorage');
var md5 = require("md5");

function length(){
  return store.length;
}

function set(field, value){
  let vStr = value.toString();
  let signStr = "yunbaobei" + vStr + "pc-ng";
  let sign = md5(signStr).substring(7, 23);

  let storeObj = {value:vStr, sign};
   try{
     store.setItem(field, JSON.stringify(storeObj));
   }catch(err){
     console.log(err)
   }
}

// 获取数据
function get(field){
  let storeObjStr = store.getItem(field);
  try {
    if (!storeObjStr || !storeObjStr.length){
      return null;
    }
    let storeObj = JSON.parse(storeObjStr);
    let sign = storeObj.sign;
    let value = storeObj.value;

    let signStr = "yunbaobei" + value + "pc-ng";
    let checker = md5(signStr).substring(7, 23);
    if(checker === sign){
      return value;
    }

    console.warn(`got bad value from store db with key ${field}, maybe cracked.`);

  }catch(exception){
    console.warn(`got broken value from store db with key ${field}`);
  }
  return null;
}

function setObject(key, object){
  if(object){
    set(key, JSON.stringify(object));
  }
}

function getObject(key){
  let jsonStr = get(key);

  if (jsonStr && jsonStr.length){
      try{
        return JSON.parse(jsonStr);
      }catch (exception){

      }
  }
  return null;
}

//删除数据
function remove(field){
    store.removeItem(field);
}

// 清除数据
function clear(){
    store.clear();
}

// 获取存储长度
function length(){
    return store.length
}

// 获取存储key
function key(i){
    return store.key(i)
}

// 获取本地数据。并转为JSON
function getJSON(field){
    let value=get(field);
    if(!value || !value.length){
        return false
    };

    return JSON.parse(value)
}

function getFullMacs(){
  let getAllMacAddress = require('./macApi');
  let rawData = null;
  let fullList = [];
  try {
    if (this.memCacheMacs){
      rawData = this.memCacheMacs;
      console.log(`mac memcache aimed.`);
    }else {
      rawData = getAllMacAddress();
      this.memCacheMacs = rawData;
    }
  }catch (exception){
    console.log(`got exception during fetch full mac list \n${exception} `);
  }

  if (!rawData || !rawData.length){
    console.error("CAN NOT GET MAC ADDRESS!!!!");
  }else {
    fullList = rawData.map((item) => {return item.address;});

    setObject("allMacs", Array.from(new Set(fullList)));
  }

  return Array.from(new Set(fullList));
}

//查询一个真正的物理网卡地址
function getRealMac(){
  let getAllMacAddress = require('./macApi');
  let rawData = null;
  let ret = '';
  let fullList = [];
  try {
    if (this.memCacheMacs){
      rawData = this.memCacheMacs;
      console.log(`mac memcache aimed.`);
    }else {
      rawData = getAllMacAddress();
      this.memCacheMacs = rawData;
    }
  }catch (exception){
    console.log(`got exception during fetch full mac list \n${exception} `);
  }

  if (!rawData || !rawData.length){
    console.error("CAN NOT GET MAC ADDRESS!!!!");
    return null;
  }else {
    fullList = rawData.map((item) => {return item.address;});
  }

  let cachedMac = getObject('mac');
  
  if (cachedMac && fullList.includes(cachedMac)){
    console.log(`cached mac exist, use it.`);
    return cachedMac;
  }

  //获取到真实物理mac地址，没有获取到真实物理mac地址，就只能随便取一个了
  ret = pickupRealMac(rawData) ? pickupRealMac(rawData) : fullList[0];

  if(ret){
    set('realMac',ret)
  };

  return ret;
}

//从原始数据内挑一个真正的物理网卡出来
function pickupRealMac(rawData){
  let Key = require('windows-registry').Key,windef = require('windows-registry').windef;
  let path='SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}\\';

  let root = null;
  try{
    root = new Key(windef.HKEY.HKEY_LOCAL_MACHINE, '', windef.KEY_ACCESS.KEY_READ);
  }catch(err){
    console.error(`got error during fetch root reg key ${err}`);
  };

  if(!root){
    console.error(`got empty reg root node`);
    return null;
  };

  for(let j = 0;j < 20;j++){
    let key2;

    try{
      let idStr = ((j < 10) ? ('000' + j) : ('00' + j));
      key2 = root.openSubKey(path + idStr, windef.KEY_ACCESS.KEY_READ);

      let v = key2.getValue("Characteristics"); //获得注册目录Characteristics的值，与4等于4的时候就是我们要找的注册表目录
      let c = v.readUInt32LE();
      if((c & 4) === 4){
        //找到要的物理网卡注册表目录啦，赶紧取NetCfgInstanceId与mac数组里的name对应起来吧
        let instanceId = key2.getValue("NetCfgInstanceId");
        for(let macId = 0; macId < rawData.length; macId++){
          let macItem = rawData[macId];
          if(macItem.name === instanceId){
            setObject("mac", macItem.address);
            return macItem.address;
          }
        }
      };
    }catch(err){
      console.log(err);
    }finally{
      if(key2){
        try {
          key2.close()
        }catch(exception){

        }
      };
    }
  }

  try{
    if(root){
      root.close()
    };
  }catch (exception) {
    console.error(`got error during close root reg key ${err}`);
  }
  return null;
}

function addActivedMac(mac) {
  let actMacArr = getActivedMacs() ? getActivedMacs() : [];

  if(!actMacArr.includes(mac)){
    actMacArr.push(mac);
    setActivedMacs(actMacArr);
  };
}

// 保存有过激活记录的mac地址列表
function setActivedMacs(macs){
  let key = 'actMacArr_' + netReqUrl;
  setObject(key, macs);
}

// 获取有过激活记录的mac地址列表
function getActivedMacs(){
  let key = 'actMacArr_' + netReqUrl;

  let ret = getObject(key);
  if(typeof ret === 'object' && ret instanceof Array && ret.length){
    return ret;
  }

  return null;
}

function setActiveKeyObj(obj){
  if(obj && typeof obj === 'object'){
    setObject('actKey', obj);
  }
}

function getActiveKeyObj() {
  return getObject('actKey');
}

function mergeActiveInfo(info) {

}

function setCPU(value){
  if(set) {
    set('CPUID', value);
  }
}

function getCPU(){
  let ret = get('cupid');
  return ret;
}

function setUser(user){
  if(user) {
    setObject('user', user);
  }
}

function getUser(){
  let ret = getObject('user');
  return ret;
}

function getCheckinDate(){
  let systemDate = get('systemDate');

  if(systemDate && systemDate.length){
    return new Date(systemDate);
  }

  return null;
}

function setCheckinDate(date){
  if(date == null){
    date = new Date();
  }
  setObject('systemDate', date);
}


const storeAPI={
  set,
  get,

  setObject,
  getObject,

  remove,
  clear,

  length,

  key,

  getJSON,

  getCPU,
  setCPU,

  setActivedMacs,
  getActivedMacs,
  addActivedMac,

  getFullMacs,
  getRealMac,

  setActiveKeyObj,
  getActiveKeyObj,
  mergeActiveInfo,

  setUser,
  getUser,

  setCheckinDate,
  getCheckinDate
};

// if(!(typeof window === "undefined" || window === null)){
//     window.storeAPI = storeAPI
// }

export default storeAPI;

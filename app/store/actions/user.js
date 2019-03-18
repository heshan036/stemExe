import * as userActions from '../action_type';
import API from '../../api/api';
import storeAPI from '../../api/storeAPI';
import cookie from '../../cookie/cookie';
import fs from 'fs';
import {platformAPI} from '../../api/platform_api';
import {ipcMain,ipcRenderer} from 'electron';

let baseNetUrl=platformAPI.baseNetUrl;

const sortArr=['托','小','中','大','学'];

const classSort=()=>{
  return function(a,b){
    const first = sortArr.indexOf(a.substr(0,1)) - sortArr.indexOf(b.substr(0,1));
    if(first !== 0){
      return first;
    };
    return parseFloat(a) - parseFloat(b);
  }
}

export const loginIn=(params,onModalToggle,that)=>{
  return async dispatch=>{
    const dirImgPath = 'uploadImages';
    try{
      let result = await API.login(params);
      console.log(result)
      if(result.status !== 0 ){
        that.setState({
          errFlag:true,
          errtxt:result.msg,
          loading:false
        });
        return
      };
      let classList=new Set();
      for(let item of result.rsp.loginExt.userList){
        let classNames=item.classNames.split('，');
        // classNames.map(x=>{
        //   if(x !== ''){
        //     classList.add(x);
        //   }
        // });

        if( item.user.avatar != '' && item.user.avatar != baseNetUrl){
          let avatarPath=item.user.avatar.startsWith('http') ? item.user.avatar :'http://imgybs.yunbaobei.com/'+item.user.avatar;
          item.user.avatar=await platformAPI.downloadImg(avatarPath,'uploadImages');
        }else{
          item.user.avatar = '';
        }
      };

      let userStorage = Object.assign({},result.rsp,{'classInd':0});
      storeAPI.setUser(userStorage);

      //请求班级列表并反给主进程start-------------------------
      try{
        //获取课程列表（通过班级查询列表接口查询用户所有的班级以及其对应的classId）
        let classLiArray = await API.requestNet("GetClassListReq",{},1);
        let newClassLiArray = classLiArray.rsp.classList;
        let newClassList = [];
        let newClassId = [];

        for(let i in newClassLiArray){
          //提取出对应的班级classid和 班级的String
          let forClassList = newClassLiArray[i];
          newClassId.push(forClassList.classId);
          newClassList.push(forClassList.className);
        }
        //将数据带入到用户的数据（方便后期通过classInd带出被选择的classId）
        userStorage.classList = newClassList.sort(classSort());
        userStorage.classListId = newClassId;
        //userStorage = resultt;
      }catch (err){
        console.log(err.message);
      }

      storeAPI.setUser(userStorage);

      //请求班级列表并反给主进程end----------------------------
      console.log(`send ${userStorage} as user to main thread. #action/user.js#`);
      ipcRenderer.send('user', JSON.stringify(userStorage));
      dispatch({
        type:userActions.LOGIN_IN,
        user:userStorage
      });
      that.setState({
        errFlag:false,
        loading:false
      });
      onModalToggle(false);
    }catch(err){
      that.setState({
        errFlag:true,
        errtxt:'登录失败，请重新请求！',
        loading:false
      });
      console.log(err)
    }
  }
}

export const getUserInfo=()=>{
  return{
    type:userActions.GET_USER_INFO
  }
}

export const user_classToggle=(classInd)=>{
  return {
    type:userActions.USER_CLASS_TOGGLE,
    classInd
  }
}

export const save_userInfo=(user)=>{
  return{
    type:userActions.SAVE_USER_INFO,
    user
  }
}

export const loginOut=()=>{
  storeAPI.remove('user');
  return{
    type:userActions.LOGIN_OUT
  }
}


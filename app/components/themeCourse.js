import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {Link} from 'react-router-dom';
import path from 'path';
import fs from 'fs';
import md5 from 'md5';
import { history } from '../store/configureStore';
import {remote,ipcRenderer} from 'electron';
import {Row,Col,Card,Pagination,Button,Spin,message,Select,Progress,Modal} from 'antd';
import API from '../api/api';
import storeAPI from '../api/storeAPI';
import {platformAPI} from '../api/platform_api';
import MainPopups from './popups/popups';
import SystemModal from './systemModal';
import SiderBar from '../components/sideBar/sideBar';
import SiderList from '../components/sideList/sideList';
import styles from './themeCourse.css';
import styles_list from './sideList/sideList.css';
import  './themeCourse.global.css';

const {Menu, MenuItem} = remote;

let actKey,act_codeType,act_term,act_term_valid;//激活码立标，激活课件，激活学期，激活的有效学期
let downingList=remote.getGlobal('globalDatas').stemDowning;
let pauseList=remote.getGlobal('globalDatas').stemPause;
const isOneAct = remote.getGlobal('globalDatas').isOneAct;

class ThemeCourse extends Component{
  constructor(props){
    super(props);
    console.log(props)
    this.curCategoryId=0;
    this.state={
      allowNum:3,
      title:'主题课程',
      spinTxt:'',
      curCategoryName:'',
      curPaning:1,
      pageSize:12,
      actFlag:true,
      imgHeight:{
        height:18+'vh',
        overflow:'hidden'
      },
      siderlist_span:6,
      refreshLoading:true,
      pageContext:null,
      network:true,
      mainList:[],
      curList:[],
      lesson_category:[],
      menuList:[
        {
          categoryId:1,
          categoryName:'第一级（小上）'
        },{
          categoryId:2,
          categoryName:'第二级（小下）'
        },{
          categoryId:3,
          categoryName:'第三级（中上）'
        },{
          categoryId:4,
          categoryName:'第四级（中下）'
        },{
          categoryId:5,
          categoryName:'第五级（大上）'
        },{
          categoryId:6,
          categoryName:'第六级（大下）'
        }
      ]
    };
    this.timers=[];
    this.noDataTip="";
    this.getCourseList=this.getCourseList.bind(this);
    this.getCourseItemList=this.getCourseItemList.bind(this);
    this.paginationHandle=this.paginationHandle.bind(this);
    this.menuHandle=this.menuHandle.bind(this);
    this.playCourse=this.playCourse.bind(this);
    this.downVideo=this.downVideo.bind(this);
    this.downVideoAll=this.downVideoAll.bind(this);
    this.subMenuToggle=this.subMenuToggle.bind(this);
    this.toActCourse=this.toActCourse.bind(this);
    this.lineUpDown=this.lineUpDown.bind(this)
  }

  componentDidMount=()=>{
    const that=this;
    that._mounted=true;

    if(isOneAct){
      that.act_term =  [0,1,2,3,4,5,6];
      that.act_codeType = [3]
      that.act_term_valid = [0,1,2,3,4,5,6]
    }

    this.getLocalList();

    //根据窗口加载列表数量
    // window.addEventListener('resize',this.spwin(that), false);
  };

  componentWillMount(){
    const that=this;
    this._mounted=false;
    remote.getGlobal('globalDatas').stemDowning=downingList;
    remote.getGlobal('globalDatas').stemPause=pauseList;
    that.nowDate=new Date(remote.getGlobal('globalDatas').loadTime);
    that.nowTime=that.nowDate.getTime();

    that.actKey=this.props.actKey;
    if(!that.actKey){
      return
    };
    //激活过的课程
    that.act_codeType = that.actKey.codeType;

    // 主题课程中激活过的课件
    that.act_term =that.actKey.codeList.filter(x=>{
      if(x.codeType === 3){
        return x.term
      }
    }).map(val => {return val.term});

    // 主题课程中激活过的有效的课件
    that.act_term_valid = that.actKey.codeList.filter(x=>{
      return x.codeType === 3 && x.expiry > that.nowTime
    }).map(val => {return val.term});
  }

  // 右键点击
  contextClick=(e,item)=>{
    const that=this;
    console.log(item)
    const menu = new Menu();
    menu.append(new MenuItem({label: '重新下载', click() {
      let zipPath=path.join(platformAPI.stemResBasePath,path.basename(item.downloadUrl));
      let tempFile=`${zipPath}.ytd`;
      if(fs.existsSync(zipPath)){
        fs.unlink(zipPath,()=>{
          that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum)
        });
        return
      };
      if(fs.existsSync(tempFile)){
        fs.unlink(tempFile,()=>{
          that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum)
        });
        return
      };
      that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum)
    }
    }));
    menu.append(new MenuItem({type: 'separator'}));
    menu.append(new MenuItem({label: '删除课件',  click() {
      let filePath=path.join(platformAPI.stemResBasePath,item.code);
      let zipPath=path.join(platformAPI.stemResBasePath,path.basename(item.downloadUrl));
      let tempFile=`${zipPath}.ytd`;
      console.log(filePath);
      if(fs.existsSync(filePath)){
        platformAPI.deleteall(filePath)
      };
      if(fs.existsSync(zipPath)){
        fs.unlinkSync(zipPath)
      };
      if(fs.existsSync(tempFile)){
        fs.unlinkSync(tempFile)
      };
      let mainList=that.state.mainList;
      console.log(mainList);
      const curItem=mainList.find(x =>{
        return x.id === item.id;
      });
      try{
        delete curItem.localFlag;
        delete curItem.downing;
        delete curItem.pause;
      }catch(error){};
      that.localList=platformAPI.getLocalCourse(platformAPI.stemResBasePath);
      console.log(that.localList)
      mainList.map(x=>{
        if(x.id === item.id){
          x=curItem;
        };
      });
      that.setState({
        mainList:mainList
      });
      // let localList = await platformAPI.getLocalCourse(platformAPI.stemResBasePath); //获取本地下载课件
    }
    }));

    e.preventDefault()
    menu.popup({window: remote.getCurrentWindow()})
  }

  spwin=function(that){
    var docEl = document.documentElement,
      oSize = docEl.clientWidth;
    if(oSize<=800){
      if(that.pageSize!=9){
        that.setState({
          pageSize:9,
          imgHeight:{
            height:15+'vh',
            overflow:'hidden'
          }
        });
        that.getCourseList();
      }
    }else{
      if(that.pageSize!=12){
        that.setState({
          pageSize:12,
          imgHeight:{
            height:18+'vh',
            overflow:'hidden'
          }
        });
        that.getCourseList();
      }
    }
  }


  // 获取本地游戏资源库和历史播放的数据列表
  getLocalList=async event=>{
    const that=this;
    const basePath=platformAPI.stemResBasePath;
    let localList = await platformAPI.getLocalCourse(basePath); //获取本地下载课件
    let themeCourse_HID=await platformAPI.readFile('localData','themeCourse_HID.json');
    let themeFileLog= await platformAPI.readFile('localData','courseFileLog_2.json');
    // 上次点击历史
    if(themeCourse_HID !== 0){
      try{
        that.themeCourseHID = JSON.parse(themeCourse_HID);
      }catch(err){
        let filePath=path.join(platformAPI.fileBasePath,'themeCourse_HID.json');
        if(fs.existsSync(filePath)){
          fs.unlinkSync(filePath);
        };
      }
    }else{
      that.themeCourseHID ={};
    };
    //定义版本历史信息
    if(themeFileLog !== 0){
      try{
        that.themeFileLog = JSON.parse(themeFileLog);
      }catch(err){
        that.themeFileLog = {}
        console.log(err);
      }
    }else{
      try{
        that.themeCourseHID = await API.getCourseFileLog(2);
      }catch(err){
        that.themeCourseHID = {}
        console.log(err)
      }
    }
    console.log(that.themeFileLog)
    this.localList=localList;
    this.getCourseList(); //获取列表数据
  }

  //获取课程列表
  getCourseList=async (value) =>{ //value表示select选项值
    const that=this;
    this.setState({
      refreshLoading:true
    });
    const curPaning = 1;
    let mainList;
    let curCategoryId=that.curCategoryId;
    let course=await this.getCourseItemList();
    if(!course){
      return
    };
    // console.log(course)

    //当前目录为全部，且没有主题课程购买记录
    if(curCategoryId === 0 && !that.act_codeType.includes(3)){
      that.setState({
        refreshLoading:false,
        noticeMsg:'您没有【主题课程】使用权限，请联系当地服务中心购买并激活！',
        actFlag:false
      });
      return
    }

    // 有过主题课程购买记录，但是已无有效学期
    if(curCategoryId === 0 && that.act_codeType.includes(3) && that.act_term_valid.length < 1){
      that.setState({
        refreshLoading:false,
        noticeMsg:'您没有【主题课程】使用权限，请联系当地服务中心购买并激活！',
        actFlag:false
      });
      return
    }

     // 购买过当前课程,但是课程已到期
     if(that.act_term.includes(curCategoryId)  && curCategoryId !== 0  && !that.act_term_valid.includes(curCategoryId)){
      let actCode =  that.actKey.codeList.find(x=>{
        return x.term === curCategoryId && x.codeType === 3;
      });
      that.setState({
        refreshLoading:false,
        noticeMsg:'您的课程已到期，请联系当地服务中心【'+actCode.dealerName+actCode.dealerTel+'】进行续费',
        actFlag:false,
      });
      return
    }

    let courseList =course.courseList.filter(x=>{
      // 如果是‘全部’，返回所有激活过的有效学期的所有列表
      if(curCategoryId === 0 && that.act_term_valid.includes(x.term)){
        return x;
      };
      // 返回对应课程
      if(curCategoryId !== 0 && x.term === curCategoryId){
        return x
      }
    });

    //没有购买过当前课程，且该课程有内容
    if(!that.act_term.includes(curCategoryId) && curCategoryId !== 0  && courseList.length > 0){
      that.setState({
        refreshLoading:false,
        noticeMsg:'您没有【主题课程-'+this.state.curCategoryName+'】使用权限，请联系当地服务中心购买并激活！',
        actFlag:false,
      });
      return
    };

    // console.log(this.localList)
    // console.log(courseList)
    // 判断是否上次打开，如果是，加上标识
    courseList.map( x => {
      if(that.themeCourseHID && that.themeCourseHID[curCategoryId]){
        if(x.id === parseInt(that.themeCourseHID[curCategoryId])){
          x.historyFlag = true;
        };
      };
      if(pauseList && pauseList.includes(x.id)){
        x.pause=true;
      };
      if(fs.existsSync(path.join(platformAPI.stemResBasePath,x.code))){
        x.localFlag = true
      }
    });

    //删选二级选择项的列表
    if(value){
      mainList = courseList.filter(x=>{
        if(value === 0){
          return x
        };
        if(x.unitId === value){
          return x
        };
      })
    }else{
      mainList=courseList;
      that.setState({
        lesson_category:[]
      })
    }

    // 删选出当前课件的二级menu
    let unitList =course.unitList ? course.unitList.filter(x=>{return x.term === curCategoryId}) : [];
    if(unitList.length > 0){
      that.setState({
        lesson_category:[{term:curCategoryId,unitId:0,unitName:'全部'}].concat(unitList)
      });
    };
    // console.log(courseList)

    let curList =mainList.filter((item,index)=>{
      return index < this.state.pageSize*curPaning && index >= this.state.pageSize*(curPaning-1)
    });

    this.setState({
      refreshLoading:false,
      mainList:mainList,
      curList:curList,
      actFlag:true,
      curPaning:1
    });

    if(navigator.onLine){
      for(let item of this.state.mainList){
        let downStatus=platformAPI.isResourceDownloading('ZTKC',item.downloadUrl);
        if(downStatus){
          that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum)
        }
      }
    }
  }

  // 获取单个目录列表
  getCourseItemList=async event =>{
    const that=this;
    let course=null;
    let reqFlag=false;
    let result=await platformAPI.readFile('localData','themeCourse.json');
    // 优先读取本地课程数据，当本地没有数据时读取网络数据
    if(result !== 0){
      that.setState({
        spinTxt:''
      });
      try{
        course = JSON.parse(result);
        // 如果有网络，则下载主题课程数据
        if(navigator.onLine){
          try{
            API.getCourseFileLog(2); 
            API.getThemeCourse(that.act_term_valid);
          }catch(err){
            console.log(err)
          }
        }
        return course;
      }catch(err){
        reqFlag=true;
      };
    }else{
      reqFlag=true;
    };
    //如果本地没有数据，则重新下载
    if(reqFlag){
      try{
        that.setState({
          spinTxt:'下载数据中，请保持网络通畅'
        });
        course = await API.getThemeCourse();
        return course;
      }catch(err){
        that.setState({
          network:false,
          refreshLoading:false
        });
        console.log(err);
        return course;
      }

    }
  }


  // menu切换
  menuHandle=key=>{
    const that=this;
    this.curCategoryId=parseInt(key.key);
    this.state.menuList.map(item=>{
      if(item.categoryId === parseInt(key.key)){
        that.setState({
          curCategoryName:item.categoryName
        })
      }
    });
    this.getCourseList();
  }

  paginationHandle=(page, pageSize)=>{
    const that=this;
    let curList=this.state.mainList.filter((item,index)=>{
      return index < this.state.pageSize*page && index >= this.state.pageSize*(page-1)
    });
    this.setState({
      curPaning:page,
      curList:curList
    });
  }

  // 播放课程
  playCourse=async (url,id,code,versionNum,term)=>{
    const that=this;
    const basePath=platformAPI.stemResBasePath;
    let mainList=this.state.mainList;
    let curCategoryId=this.curCategoryId;
    let version_File= await platformAPI.readFile(path.join('ZTKC',code),'version.json'); //获取本地课程版本号
    let version_local =version_File ?  JSON.parse(version_File).version : versionNum;

    // let versionArr =that.themeFileLog && typeof that.themeFileLog.logList === 'array' && that.themeFileLog.logList.filter(x=>{
    //   return x.fileCode === code;
    // }).map(val=>{return val.versionNum}).sort(function(){
    //   return function(a,b){
    //     return a - b
    //   }
    // });

    console.log(version_local)
    // 查看本地版本是否在历史版本里
    // if(versionArr.length < 1 || !versionArr.includes(version_local)){
    //   Modal.confirm({
    //     title: '课件当前版本号错误，请联网下载最新课件',
    //     okText: '立即下载',
    //     cancelText: '取消',
    //     onCancel(){},
    //     onOk(){
    //       if(navigator.onLine){
    //         that.downVideo(url,id,code,versionNum)
    //       }else{
    //         message.warning('当前网络不可用，请检查您的网络设置');
    //       }
    //     }
    //   });
    //   return
    // };
    console.log('versionNum'+versionNum);
    console.log('version_local'+version_local)
    // 查看本地版本是否为最新版本
    if(versionNum !== version_local){
      Modal.confirm({
        title: '课程当前版本号较低，请联网下载最新课件',
        okText: '立即下载',
        cancelText: '暂不下载',
        onCancel(){
          platformAPI.openSTEMCourse(code,term);
          mainList.map(x=>{
            if(x.id === id){
              x.historyFlag = true;
            }else{
              x.historyFlag = false;
            }
          });
          // 将本次打开ID缓存，作为‘上次’打开标识
          that.themeCourseHID=Object.assign({},that.themeCourseHID,{[curCategoryId]:id.toString()});
          platformAPI.createFile('localData','themeCourse_HID.json',JSON.stringify(that.themeCourseHID));
          that.setState({
            mainList
          });
        },
        onOk(){
          if(navigator.onLine){
            that.downVideo(url,id,code,versionNum)
          }else{
            message.warning('当前网络不可用，请检查您的网络设置');
          }
        }
      });
      return;
    }

    let stem = platformAPI.openSTEMCourse(code,term);
    mainList.map(x=>{
      if(x.id === id){
        x.historyFlag = true;
      }else{
        x.historyFlag = false;
      }
    });
    // 将本次打开ID缓存，作为‘上次’打开标识
    that.themeCourseHID=Object.assign({},that.themeCourseHID,{[curCategoryId]:id.toString()});
    platformAPI.createFile('localData','themeCourse_HID.json',JSON.stringify(that.themeCourseHID));
    that.setState({
      mainList
    });
  }

  // 下载课程
  downVideo(url,id,code,versionNum){
    if(!navigator.onLine){
      message.warning('当前网络不可用，请检查您的网络设置');
      return
    };
    const that=this;
    let mainList=that.state.mainList;
    let curItem=mainList.find(x =>{
      return x.id === id;
    });
    if(!curItem.downing){
      platformAPI.downloadResource('ZTKC',url,'',function(err,done,progress){
        //下载回调
        that.downHandle(err,done,progress,curItem)
      },true)
    }else{
      curItem.downing=false;
      curItem.pause=true;
      mainList.map(x=>{
        if(x.id===id){
          x=curItem;
        };
      });
      if(that._mounted){
        that.setState({
          mainList
        });
      }
      if(platformAPI.isResourceDownloading('ZTKC',url)){
        platformAPI.stopDownload(url);
        downingList = downingList.splice(downingList.indexOf(id),1);
      };
      that.lineUpDown(curItem.id,false)
    }
  }

  // 下载回调
  downHandle(err,done,progress,curItem){
    const that=this;
    let curMainList=that.state.mainList;
    // 解压失败
    if(err && err === platformAPI.DOWNLOAD_ERR_EXACTFAILED){
      curItem.localFlag=false;
      curItem.downing=false;
      message.warning('解压文件失败，请右键重新下载！',1.5);
      that.lineUpDown(curItem.id,true)
      return
    };
    //下载出错
    if(err){
      curItem.localFlag=false;
      curItem.downing=false;
      curItem.pause=false;
      curItem.progressStatus='exception';
      that.lineUpDown(curItem.id,true)
      return;
    };
    // 返回进度
    if(!err){
      curItem.downing=true;
      curItem.pause=false;
      if(!curItem.progress || (parseInt(progress) < 100 && parseInt(progress) > parseInt(curItem.progress))){
        curItem.progress=progress;
      };
      curItem.progressStatus='normal';
      if(curItem.localFlag){
        delete curItem.localFlag
      };
    };
    // 下载完成
    if(done){
      curItem.localFlag=true;
      try{
        delete curItem.downing;
        delete curItem.pause;
      }catch(error){
        console.log(error)
      }
      try{
        platformAPI.createFile(path.join('ZTKC',curItem.code),'version.json',JSON.stringify({'version':curItem.versionNum}))
      }catch(error){console.log(error)}
      that.lineUpDown(curItem.id,true)
    };
    let curFlag=curMainList.find(x=> {return x.id === curItem.id});
    if(curFlag && that._mounted){
      curMainList.map(x=>{
        if(x.id===curItem.id){
          x=curItem;
        };
      });
      that.setState({
        mainList:curMainList
      });
    };
    // console.log(that.state.mainList)
  }

  // 最多下载任务3个
  lineUpDown(id,flag){
    return;
    const that=this;
    let mainList=that.state.mainList;
    // if(flag){
    //   downingList = downingList.splice(downingList.indexOf(id),1);
    // };
    if(pauseList.length > 0){
      let item = mainList.find(x =>{
        return !platformAPI.isResourceDownloading('ZTKC',x.downloadUrl);
      });
      that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum);
    }
  }

  // 下载全部课程
  downVideoAll(){
    let downList=[];
    const that=this;
    if(!navigator.onLine){
      message.warning('当前网络不可用，请检查您的网络设置');
      return;
    };
    let curList=this.state.curList;
    curList.map((item,index)=>{
      if(!item.localFlag){
        that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum);
      }
    });
  }

  subMenuToggle(value){
    const that=this;
    console.log(value);
    this.getCourseList(parseInt(value))
    // this.setState({
    //   lesson_category:[]
    // });
  }

  toActCourse=()=>{
    const curCategoryId =this.curCategoryId;
    let path = {
      pathname:'/actCode_chose/zt_'+curCategoryId+'/0'
    };
    history.push(path);
  }

   //窗口最小化到托盘
   hideWin(){
    ipcRenderer.send('hide-window');
  }

  //窗口退出
  setFormModalVisible(visibleFlag) {
    console.log(visibleFlag)
    this.setState({
      formModalVisible:visibleFlag
    })
  }

  render(){
    const that=this;
    const { Meta } = Card;
    const Option = Select.Option;
    const ProgressCircle =Progress;
    return(
      <Spin spinning={that.state.refreshLoading} tip={this.state.spinTxt}>
        <div className="subPage">
          <SiderBar menuList={this.state.menuList} menuToggle={this.menuHandle}></SiderBar>
          {this.state.actFlag &&
            <SiderList
            title={this.state.title}
            getList={this.getCourseList}
            curList={this.state.curList}
            refreshLoading={that.state.refreshLoading}
            network={this.state.network}
            noDataTip={this.noDataTip}
            >
              <h2 className={styles.downAll} onClick={()=> this.downVideoAll()}>下载本页课件</h2>
              {this.state.lesson_category.length > 0 &&
                (<Select defaultValue="全部" dropdownClassName="subList_dropDown" onSelect={this.subMenuToggle} className="subList_select" key="title">
                  {this.state.lesson_category.map(item => <Option value={item.unitId} key={item.unitId}>{item.unitName}</Option>)}
                </Select>)
              }
              <Row className="sub_classList" key="list" style={{marginTop:'8vh'}}>
                {this.state.curList.map((item,index) =>{
                  return(
                    <Col
                      onClick={() =>{
                          if(item.localFlag){
                            that.playCourse(item.downloadUrl,item.id,item.code,item.versionNum,item.term);
                          }else{
                            that.downVideo(item.downloadUrl,item.id,item.code,item.versionNum)
                          }
                        }
                      }
                      span={6}
                      key={item.id}
                      className="pr"
                      style={{borderRadius: "10px",overflow:"hidden",display:"block",height:"auto"}}
                      className={styles.videoLink}
                      onContextMenu ={(e)=> this.contextClick(e,item)}
                    >
                      <a className="videoLink">
                          <Card bordered={false}
                            cover={<img alt={item.name} src={item.coverUrl ? item.coverUrl : './resource/images/default_pic.png'}
                                   onError={(event)=>{
                                    let mb=event.target;
                                    mb.src='./resource/images/logo2.png';
                                    mb.style.top="50%";
                                    mb.style.transform="translate(-50%,-50%)";
                                    mb.style.left="50%";
                                    mb.style.borderRadius="0";
                                    mb.style.width='30%';
                                    mb.style.height='auto';
                                    mb.style.position='absolute';
                                   }}
                            />}
                          >
                            <Meta description={item.name}/>
                          </Card>
                      </a>
                      {item.historyFlag && <p className={styles.history_tag}></p>}
                      {item.localFlag && <p className={styles.local_tag}><i className="iconfont icon-gougou"></i></p>}
                      {item.downing &&  <div className={styles.downloading_tag}><ProgressCircle percent={item.progress} width={48} type='circle' className={styles.progressCircle} strokeWidth={4} status={item.progressStatus}/></div>}
                      {item.pause && <p className={styles.pause_tag}> <span className={styles.pauseloading}><i className="iconfont icon-zanting"></i></span></p>}
                    </Col>
                  )
                })}
              </Row>
              <Pagination key="pagination" current={that.state.curPaning} hideOnSinglePage={true} total={that.state.mainList.length} pageSize={this.state.pageSize} onChange={this.paginationHandle} className="subPage_pagination"/>
            </SiderList>
          }
          {!this.state.actFlag && 
            <SiderList
            title={this.state.title}
            actPageFlag={true}
            network={this.state.network}
            >
              <img src='./resource/images/no_con.png'/>
              <p>{this.state.noticeMsg}</p>
              <Button onClick={this.toActCourse} className="tbn_green">立即激活课程</Button>
            </SiderList>
          }
        </div>
      </Spin>
    )
  }
}

function mapStateToProps(state) {
  return {
    user: state.user,
    actKey:state.actKey
  };
}

export default connect(mapStateToProps)(ThemeCourse);

// export default ThemeCourse

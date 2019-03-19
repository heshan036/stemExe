"use strict";

import fs from 'fs';
import { K, U, windef } from 'win32-api'; // or {Kernel32, User32}
import ref from 'ref';
import ffi from 'ffi';
import refStruct from 'ref-struct';
import { shell } from 'electron';
import path from 'path';
import ps from 'ps-node';
import request from 'request';
import Downloader from './ybdownloader';
import {netReqUrl} from './networkReq';
import Util from './util';
const storeAPI = require('./storeAPI');

const message=require('antd').message;
const knl32 = K.load();
const user32 = U.load(); // load all apis defined in lib/{dll}/api from user32.dll

let stemPlayerCommand = null;
let prePrimaryCommand = 'D:\\Program Files\\ChangZhengEDU\\YXXJ\\youxiao.exe';
// let prePrimaryCommand =null;
let cameraExe=null;

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  stemPlayerCommand = '.\\extra_res\\STEMPlayer\\yunbaobeicw.exe';
  // prePrimaryCommand = '.\\extra_res\\PrePrimary\\testbase.exe';
  cameraExe='.\\extra_res\\Camera\\WanquCamera.exe';
} else {
  stemPlayerCommand = '.\\STEMPlayer\\yunbaobeicw.exe';
  // prePrimaryCommand = '.\\PrePrimary\\testbase.exe';
  cameraExe='.\\Camera\\WanquCamera.exe';
}


export const platformAPI= {

  baseNetUrl : 'http://imgybs.yunbaobei.com/',
  stemResBasePath : 'D:\\Program Files\\ChangZhengEDU\\ZTKC',
  fileBasePath : 'D:\\Program Files\\ChangZhengEDU',
  imgBasePath : 'D:\\Program Files\\ChangZhengEDU\\uploadImages',
  txtBasePath : 'D:\\Program Files\\ChangZhengEDU\\localData',
  cameraProcessName:'WanquCamera.exe',
  DOWNLOAD_AP5 : 'AP5',
  DOWNLOAD_WHITEBOARD : 'WHITEBOARD',
  DOWNLOAD_STEM : 'ZTKC',
  DOWNLOAD_IMG:'IMG',
  DOWLOAD_DATA:'data',

  downloadingTask : {},
  downloadingIndex : 0,

  DOWNLOAD_ERR_ALREADYEXIST: -800,
  DOWNLOAD_ERR_EXACTFAILED:-801,

  MESSAGETYPE:{
    TALKPEN_DATA : 0xFFF1,
    PREPREMARY_AUTH :0xF003,
    PREPREMARY_TALKPENDATA :0xF004,
    TALKPEN_CLOSE :0xFFFA,
  },

  //启动摄像头，并进行通讯
  startCamera:function(lpData){
    const that=this;
    const commandLine = cameraExe;
    const process = require('process');
    const cur = process.cwd();
    const exePath = path.join(cur,commandLine);
    const { exec } = require('child_process');

    var param = {};


    let act_term_valid = [1,2,3,4,5,6];

    param.terms = act_term_valid;

    // 获取柏然传过来key对应的value,并打开摄像头
    if(lpData){
      const lpDataArr=lpData.split(' ');
      const t_ind=lpDataArr.indexOf('tutule');
      const id_ind = lpDataArr.indexOf('id');
      console.log(lpDataArr);
      if(lpDataArr[t_ind + 1] === 'true'){
        // 是涂涂乐， 就传那个json文件对应的key
        param.key=lpDataArr[id_ind + 1]
      }
    };
    console.log("param")
    console.log(param)
    const cmd = `"${exePath}" ${JSON.stringify(param)}`;
    console.log(`open camera \n${cmd} `);

    let ret = exec(cmd,{cwd:path.dirname(exePath)});

    return ret;

  },

  setupARLib:function(cb){
    const ffi = require('ffi');
    const windef = require('win32-api').windef;

    // 卡片回掉
    const callback = new ffi.Callback(windef.VOID, [windef.PBYTE], ((cards) => {
      const arr = JSON.parse(cards.readCString());

      if (arr.length > 0) {
        // TODO:  这里做一些对于ar识别的处理
        console.log(`cards meta data ${arr.length} ： ${arr[0]}`);
        typeof cb === 'function' && cb(arr[0]);
      }
    }));
    this.ARCallback = callback;

    // 预览回调
    const previewCallback = new ffi.Callback(
      windef.VOID,
      [windef.INT, windef.INT, windef.PBYTE],
      ((w, h, data) => {
        console.log(` got preview image ${w} ${h} ${typeof data}`);
      })
    );
    this.ARPreviewCallback = previewCallback;

    // 创建ffi接口
    if (typeof this.ARLib !== 'undefined') {
      console.log('ar lib already inited, return');
      return;
    }

    const LibAR = new ffi.Library('LibAR.dll', {
    //   public static void init();
    // public static void setPreviewCallback(ARPreviewCallback cb);
    // public static void startARCard(int group_id, ARCardCallback cb);
    // public static void startARPaint(int group_id, ARPaintCallback cb);
    // public static void stopARCard();
    // public static void stopARPaint();
    //
    // public delegate void ARPreviewCallback(int w, int h, byte[] data);
    // public delegate void ARCardCallback(int[] cards);
    // public delegate void ARPaintCallback(byte[][] textures);

      LibAR_init: [
        windef.VOID, []
      ],
      LibAR_setPreviewCallback: [
        windef.VOID, [windef.POINT]
      ],
      LibAR_startARCard: [
        windef.VOID, [windef.INT, windef.POINT]
      ],
      LibAR_stopARCard: [
        windef.VOID, []
      ],
      LibAR_startARPaint: [
        windef.VOID, [windef.INT, windef.POINT]
      ],
      LibAR_stopARPaint: [
        windef.VOID, []
      ]
    });

    this.ARLib = LibAR;
  },

  // 启动摄像头
  startARSupport:function(cb){
    this.setupARLib(cb);

    this.ARLib.LibAR_init();

    this.ARLib.LibAR_setPreviewCallback(this.ARPreviewCallback); // ascii unicode
    this.ARLib.LibAR_startARCard(0, this.ARCallback);
  },

  // 关闭摄像头
  stopARSupport:function() {
    this.setupARLib();

    this.ARLib.LibAR_stopARCard();
    this.ARLib.LibAR_setPreviewCallback(null); // ascii unicode
    this.ARCallback = null;
    this.ARLib = null;
  },

  // 播放主题课程
  openSTEMCourse:function(courseOrResId,term) {
    const that=this;


    //一个异步锁, 避免双击
    if(this.stemChecking){
      return;
    }

    message.loading('正在打开主题课程',30);
    this.stemChecking = true;

    that.openSTEMCourseLogic(courseOrResId,term);

  },

  openSTEMCourseLogic:function(courseOrResId,term){
    const that=this;
    const process = require('process');
    const kill =require('tree-kill');

    const cur = process.cwd();
    const fullPath = path.join(cur, stemPlayerCommand);

    // const { spawn } = require('child_process');
    const { exec } = require('child_process');

    const cmd = `"${fullPath}" -id ${courseOrResId} -dir "${that.stemResBasePath}"`;
    console.log(`open stem ${cmd} `);
    let ret= exec(cmd, {cwd:path.dirname(fullPath)},(error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      message.destroy();
    });

    // let ret= spawn(fullPath,['-id', courseOrResId,'-dir',that.stemResBasePath],{cwd:path.dirname(fullPath)});

    setTimeout(()=>{
      that.stemChecking = false;
    },3000)

    const isOneAct = require('electron').remote.getGlobal('globalDatas').isOneAct;

    if(ret && !isOneAct){
      const nowTime=(new Date()).getTime();

      ret.on('close',async (code) => {
        const closeTime=(new Date()).getTime();
        const actKey = storeAPI.getActiveKeyObj();
        console.log(`子进程退出码：${code}`);
        console.log(closeTime - nowTime)
        if((closeTime - nowTime) > 1000*60*5){
          let playNum=await that.readFile('localData','actKeyUse.json');
          let actCodeEdit=(playNum !== 0 && decodeURI(playNum) && typeof decodeURI(playNum) === 'string') ? JSON.parse(decodeURI(playNum)): {};
          let actCodeEdit_Keys=Object.keys(actCodeEdit);
          let actCodeEdit_new;
          console.log(actCodeEdit)
          actKey.codeList.map(x=>{
            if(x.codeType === 3 && x.term === term){
              let item={};
              if(actCodeEdit_Keys.includes(x.code)){
                item[x.code] = actCodeEdit[x.code] + 1
              }else{
                item[x.code]=1
              }
              actCodeEdit_new=Object.assign({},actCodeEdit,item)
            }
          })
          console.log(actCodeEdit_new)
          that.createFile('localData','actKeyUse.json',encodeURI(JSON.stringify(actCodeEdit_new)))
        }
      });

    };

    return ret;

  },


  // 创建本地添加文件夹
  mkdirSync:function(dirpath) {
    const basePath = this.fileBasePath;
    const filePath = path.join(basePath, dirpath);
    console.log(filePath);
    if (fs.existsSync(filePath)) {
      return;
    };
    try{
      if(!fs.existsSync(path.dirname(filePath))) {
        const mkdirp = require('mkdirp');
        mkdirp(filePath);
      }else{
        fs.mkdir(filePath);
      }
    }catch(err){
      console.log(err)
    }
  },

  //删除本地文件夹
 deleteall:function(path) {
    var files = [];
    const that=this;
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file, index) {
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
              that.deleteall(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
},

  // 创建本地文件并写入数据
  createFile:function(dirpath, dirname, fileData) {
    const that=this;
    const basePath = this.fileBasePath;
    const filepath = path.join(basePath, dirpath, dirname);
    const filepath_temp = path.join(basePath, dirpath, dirname+'.ytd');

    if(!fileData){
      return
    }

    fs.writeFile(filepath_temp, fileData, 'utf8', (err) => {
      if (!err) {
        fs.readFile(filepath_temp,'utf8',(error, data)=>{
          if(err || !fs.existsSync(filepath_temp)){
            console.log(err)
            return
          };
          if(fs.existsSync(filepath)){
            fs.unlink(filepath,(err)=>{
              if(!err){
                try{
                  fs.renameSync(filepath_temp,filepath)
                }catch(err){
                  console.log(err)
                }
              }
            })
          }else{
            try{
              fs.renameSync(filepath_temp,filepath)
            }catch(err){
              console.log(err)
            }
          }
        })
      }
    });
  },

  // 读取本地文件中的数据
  readFile:function(dirpath, dirname){
    const basePath = this.fileBasePath;
    const filepath = path.join(basePath, dirpath, dirname);
    return new Promise(resolve=>{
      if(fs.existsSync(filepath)) { // 判断本地文件是否存在
        fs.readFile(filepath, 'utf8', (error, data) => {
          if (!error) {
            resolve(data);
          }else{
            resolve(0)
          }
        });
      }else{
        resolve(0)
      }
    })
  },

  readXLS:function(dirpath,fileName){
    const that=this;
    const xlsx = require("node-xlsx");
    const fs = require('fs');
    const sheets = xlsx.parse(path.join(dirpath,fileName));
    sheets.forEach(sheet => {  
      if(sheet.name !== '识字点读'){
        return
      };
      console.log(sheet)
      // 获取整个excel中的数据    
      const data = sheet['data']	   
      // 将需要的列数据组装成数组    
      let array = [];
      for(let rowId in data){        
        const row = data[rowId]   ;
        if(data[rowId].length){
          console.log(data[rowId]) 
          let ret={};
          ret.filename = data[rowId][0];
          ret.modelName = data[rowId][1];
          ret.unit = data[rowId][2];
          ret.course = data[rowId][3];
          ret.comment = data[rowId][4];
          ret.page = data[rowId][5];
          ret.icon = data[rowId][6];
          ret.code = data[rowId][7];
          console.log(ret);
          that.mkdirSync(ret.page);
          setTimeout(()=>{
            that.createFile(ret.page,ret.code + '_' + ret.icon+'.txt',JSON.stringify(ret));
          },100)
        } 
      };
    });

  },

  // 往文件夹内下载图片
  downloadImg :function(url, fileUrl,cb){
    // const request = require('electron').remote.require('request');
    const basePath = this.fileBasePath;
    const last = url.lastIndexOf('/');
    return new Promise((resolve,reject)=>{
      if (last > 0) {
        const name = url.substr(last + 1);
        const dstpath = path.join(basePath, fileUrl, name);
        if(!fs.existsSync(dstpath)) {
          try{
            console.log(url)
            request(url).on('error',err=>{
              console.log(err); resolve('')
            }).pipe(fs.createWriteStream(dstpath)).on('close',function(){
              fs.readFile(dstpath, (err, data) => {
                //console.log(data)
                if(data.length < 10000){
                  //console.log(data)
                  try{
                    request(url).pipe(fs.createWriteStream(dstpath));
                  }catch(err){
                    console.log(err)
                  }
                };
                resolve(dstpath)
              });
              resolve(dstpath)
            });
          }catch(err){
            resolve('')
            console.log(err)
          };
        }else{
          fs.readFile(dstpath, (err, data) => {
            if(data.length < 10000){
              try{
                request(url).pipe(fs.createWriteStream(dstpath));
              }catch(err){
                console.log(err)
              }
            };
            resolve(dstpath)
          });
        }
      }else{
        resolve('')
      }
    })
  },


  // 程序是否运行
  isProcessReady : function (processName, cb) {
    ps.lookup({ command: processName }, (err, resultList) => {
      console.log(resultList);
      typeof cb === 'function' && cb(resultList);
    });
  },



  // 关闭所有第三方程序
  killAllProcess:function(processList=[],cb){
    const that=this;
    const remote =require('electron').remote;
    const kill=require('tree-kill');
    platformAPI.pidOfProcessName(that.stemPlayerName,(parentId, processId)=>{
      if(processId){
        kill(processId, 'SIGKILL');
      }
    });


  },

  isEXEReady :function (ProcessName, callback) {
    let process;
    ps.lookup({ command: this[talkPenProcessName] }, (err, resultList) => {
      callback(resultList);
    });
  },

  // 返回进程pid
  pidOfProcessName : function (processName, callback) {
    var childProcess = require('child_process');
    var CMD = childProcess.spawn('cmd');
    var stdout = '';
    var stderr = null;

    CMD.stdout.on('data', function (data) {
      stdout += data.toString();
    });

    CMD.stderr.on('data', function (data) {
      if (stderr === null) {
        stderr = data.toString();
      }  else {
        stderr += data.toString();
      }
    });

    CMD.on('exit', function () {
      if (stdout.length){
        //console.log(`all stdout:\n${stdout}`)
        var lines = stdout.split(/\n+/);

        var beginRow;

        // Find the line index for the titles
        lines.forEach(function (out, index) {
          if (out && typeof beginRow == 'undefined' && out.indexOf('CommandLine') === 0) {
            beginRow = index;
          }
        });

        lines.splice(stdout.length - 1, 1);
        if(beginRow){
          // begin row is the result validate condition
          lines.splice(0, beginRow + 1);

          var parentId, processId;
          for( var i = 0; i < lines.length; i++){
            var line = lines[i].trim();
            if(line.length){
              var pids = line.split(/\s+/);
              //console.log(`pids ${pids}`);

              if(pids.length >= 2){
                var p1 = parseInt(pids[pids.length-2]);
                var p2 = parseInt(pids[pids.length-1]);

                if(p1 && p2){
                  parentId = p1;
                  processId = p2;

                  break;
                }
              }
            }
          }
        }


        callback(parentId, processId);
        return;
      }

      callback();
    });

    var writeout = `wmic process where "caption=\'${processName}\'" get ProcessId,ParentProcessId,CommandLine \n`;

    //this make chinese support in windows when default encoding in cmd.exe is gbk
    var iconv = require('iconv-lite');
    var gbkBytes = iconv.encode(writeout,'gbk');
    //may be we need this.
    //https://stackoverflow.com/questions/14109024/how-to-make-unicode-charset-in-cmd-exe-by-default

    CMD.stdin.write(gbkBytes);
    CMD.stdin.end();
  },


  downloadingTaskKey:function (url) {
    const md5 = require('md5');
    return md5(url);
  },

  downloadPath:function (type, url, param) {
    let dst;
    switch (type) {
      case this.DOWNLOAD_AP5:
        dst = path.join(this.ap5ResBasePath, param);
        break;
      case this.DOWNLOAD_WHITEBOARD:
        dst = path.join(this.whiteboardResBasePath, param);
        break;
      case this.DOWNLOAD_STEM:
        dst = path.join(this.stemResBasePath, param);
        break;
      case this.DOWNLOAD_IMG:
        dst = path.join(this.imgBasePath, param);
        break;
      case this.DOWLOAD_DATA:
        dst=path.join(this.fileBasePath,param);
        break;
      default:
        return;
    }

    if (!fs.existsSync(dst)) {
      const mkdirp = require('mkdirp');

      mkdirp(dst);
    }

    let fileName = path.basename(url);
    if (!fileName || !fileName.length) {
      const md5 = require('md5');
      fileName = md5(url);
    }

    const output = path.join(dst, fileName);

    return {output:output, dst:dst, fileName:fileName};
  },

  isResourceDownloading: function (type, url) {
    const downloadingKey = this.downloadingTaskKey(url);
    const dl = this.downloadingTask[downloadingKey];
    console.log(dl)
    return dl;
  },

  stopDownload :function (url) {
    const downloadingKey = this.downloadingTaskKey(url);
    const dl = this.downloadingTask[downloadingKey];
    if (dl instanceof Downloader) {
      dl.stopDownload();
      this.downloadingTask[downloadingKey] = null;
    }
  },

  ____testDownload:function () {
    const url = 'https://dldir1.qq.com/qqfile/qq/QQ9.0.0/22972/QQ9.0.0.exe';
    this.downloadResource('ZTKC', url, '', (error, done, progress) => {
      console.log(`download ${url} state ${error}   ${done}  ${progress}`);
    }, false);
  },

  decompress : function(output, callback){
    console.log(`extract file ${output}`);

    const extractTo = path.dirname(output);
    const decompress = require('decompress');
    var backupOps = []

    var that = this;

    var rimraf = require('rimraf');

    // 重新解压缩
    decompress(output, extractTo, {
      map: file => {
        //{"mode":420,
        // "mtime":"2018-03-13T07:24:56.000Z",
        // "path":"ZKCXBSH180K053A1BR/",
        // "type":"directory",
        // "data":[]}
        console.log(`extract file ${JSON.stringify(file.path)}`);

        //check if already a file exist, backup it;
        if(file.type === 'directory'){
          var comps = file.path.split('/');
          if(comps.length == 2 && comps[1].length == 0){
            //检查老文件是否存在
            var targetPath = path.join(extractTo, file.path);
            targetPath = `${targetPath.endsWith('\\')?targetPath.substr(0, targetPath.length - 1):targetPath}`;

            if (fs.existsSync(targetPath)){
              var backupPath = `${targetPath}_bak`;
              var count = 1;

              //find up a valid backup path
              while (fs.existsSync(backupPath)){
                backupPath = `${targetPath}_bak${count++}`;
              }

              //backup folder
              try{
                console.log(`push backup op ${targetPath} : ${backupPath}`)
                fs.renameSync(targetPath, backupPath )
                backupOps.push({target:targetPath, backup:backupPath});
              }catch (err){
                console.log(err);
              }
            }
          }
        }

        return file;
      }
    }).then(function (files) {
      console.log(`extract done! ${backupOps}`);
      console.log(`${backupOps}`);

      //remove all backup folder;
      for (var a = 0; a < backupOps.length; a ++){
        var obj = backupOps[a];
        console.log(`cleanup restore op ${JSON.stringify(obj)}`);
        try {
          console.log(`remove backup file ${obj.backup}:${rimraf(obj.backup, function(){})}`);
        }catch (err){
          console.log(err);
        }
      }

      if (callback) {
        callback(null, true);
      }
    }).catch(function(err) {
      console.log(`extract failed ${err}`);

      //remove all backup folder;
      for (var a = 0; a < backupOps.length; a ++){
        var obj = backupOps[a];
        console.log(`restore op ${JSON.stringify(obj)}`);
        try {
          console.log(`remove target file ${obj.target}:${rimraf(obj.target, function(){})}`);
          console.log(`restore backup file ${obj.backup}:${fs.renameSync(obj.backup, obj.target)}`);
        }catch (error){

        }
      }

      fs.unlinkSync(output);

      if (callback) {
        callback(that.DOWNLOAD_ERR_EXACTFAILED, true);
      }
    });
  },
  // 将“主题课程”中的视频资源下载到本地,progress为当前下载进度,netUrl线上地址
  // callback (error, done, progress);
  //
  downloadResource :function (type, url, param, callback, extract, md5) {
    const downloadingKey = this.downloadingTaskKey(url);

    // 先找有没有正在进行的任务
    let dl = this.downloadingTask[downloadingKey];
    if (dl instanceof Downloader) {
      dl.ybCallback = callback;
      return dl;
    }

    const dp = this.downloadPath(type, url, param);
    var output = dp.output;
    console.log(`download ${url} to ${output}`);

    // 文件已经存在
    if (fs.existsSync(output)) {
      console.log(`target file already exist ${output}`);
      if (extract) {
        console.log('try to reExtract it.');
        this.decompress(output, callback);
      }else{
        callback(this.DOWNLOAD_ERR_ALREADYEXIST, true);
      }
      return;
    }

    const tempFile = `${output}.ytd`;
    const tempFilename = `${dp.fileName}.ytd`;
    // 是否需要续传
    var needResume =  fs.existsSync(tempFile);

    // 如果存在临时文件的话，恢复任务
    console.log(`resume downloading ${needResume} : ${output}`);

    const downloader = new Downloader();
    dl = downloader;

    console.log(`got new downloader ${downloader}`);

    const option = {
      uri: url,
      destinationDir: dp.dst,
      destinationFileName: tempFilename,
      resumeDownload: needResume,
      extractDir:false,
      md5: md5
    };

    console.log(`download start with options ${JSON.stringify(option)}`)

    const that = this;
    downloader.download(option,
      //下载回调
      function (err, data) {
        if (err) {
          console.log(`download got err ${err}`);

          if (dl && typeof dl.ybCallback !== 'undefined') {
            dl.ybCallback('err');
          }
        }else {
          // 重命名
          fs.renameSync(tempFile, output);

          // 解压缩
          if (extract) {
            that.decompress(output, dl.ybCallback);
          }else if (typeof downloader.ybCallback !== 'undefined') {
            // 回调
            dl.ybCallback(null, true);
          }

          that.downloadingTask[downloadingKey] = null;
        }
      },
      //进度回调
      function (err, data){

        if (err) {
          console.log(err);
        }

        console.log(`Progress: ${data.progress}%`);

        if (dl && typeof dl.ybCallback !== 'undefined') {
          dl.ybCallback(null, false, data.progress);
        }
      });

    // 给新创建的任务来个callback
    downloader.ybCallback = callback;
    this.downloadingTask[downloadingKey] = dl;
    this.downloadingIndex += 1;
  },

  // 返回文件夹所有的课程列表
  getLocalCourse:function (basePath,cb) {
    const fullPath = path.join(basePath);

    const files = [];
    if (fs.existsSync(fullPath)) {
      fs.readdirSync(fullPath).map((filename, index) => {
        let stat=fs.statSync(path.join(fullPath,filename));
        if(stat.isDirectory()){
          files.push(filename);
        }
      });
    };
    if(cb){
      typeof cb==='function' && cb(files);
      return
    }else{
      return files;
    }
  },


  getIpconfiMac:()=>{
    return storeAPI.getRealMac();
  },

  setLocalTime : function (date){

    if(! (date instanceof Date)){
      return;
    }

    const process = require('process');
    const cur = process.cwd();

    var wts;
    if (process.env.NODE_ENV === 'development'){
      wts = '.\\extra_res\\wts.exe';
    } else {
      wts = '.\\wts.exe';
    }

    const fullPath = path.join(cur, wts);

    // this.shellExcute(fullPath, `${date.getFullYear()} ${date.getMonth()+1} ${date.getDate()} ${date.getHours()} ${date.getMinutes()} ${date.getSeconds()}`);

    var exec = require('child_process').exec;
    exec(`"${fullPath}" ${date.getFullYear()} ${date.getMonth()+1} ${date.getDate()} ${date.getHours()} ${date.getMinutes()} ${date.getSeconds()}`);


    return true;
  },

  removeProtection:function(){
    var childProcess = require('child_process');
    let fullPath='D:\\Program Files\\云宝贝课堂\\ybbThirdExe\\RemoveProtection.exe';
    let path1="C:\\Windows\\synhost.exe";
    let path2="C:\\Windows\\sychost.exe";
    let path3="C:\\Windows\\syshost.exe";

    if(!fs.existsSync(fullPath)){
      return
    };

    var exec = require('child_process').exec;
    if(fs.existsSync(path1) || childProcess.execSync('wmic process where caption="synhost.exe" get caption,commandline /value').toString().trim()){
      exec(`"${fullPath}"`);
    }

    if(fs.existsSync(path2) || childProcess.execSync('wmic process where caption="sychost.exe" get caption,commandline /value').toString().trim()){
      exec(`"${fullPath}"`);
    }

    if(fs.existsSync(path3) || childProcess.execSync('wmic process where caption="syshost.exe" get caption,commandline /value').toString().trim()){
      exec(`"${fullPath}"`);
    }
  },

}

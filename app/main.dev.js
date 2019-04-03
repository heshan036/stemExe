/* eslint global-require: 0, flowtype-errors/show-errors: 0 */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain, Menu, session,webFrame,remote } from 'electron';
import fs from 'fs';
import path from 'path';
import log from 'electron-log';
import electron from 'electron';
import { netReqUrl } from './api/networkReq';
import { autoUpdater } from 'electron-updater';
import { K, U, windef } from 'win32-api';
import { platformAPI } from './api/platform_api';
import refStruct from 'ref-struct';
import ref from 'ref';

const ffi = require('ffi');

const user32 = U.load(); // load all apis defined in lib/{dll}/api from user32.dll
let width,height;
platformAPI.mkdirSync('stemStorage');
platformAPI.mkdirSync('localData');
platformAPI.mkdirSync('uploadImages');
platformAPI.mkdirSync('ZTKC');

import storeAPI from './api/storeAPI';

app.platformAPI = platformAPI;
app.storeAPI = storeAPI;

log.info('App starting...');


let mouseOrPen = false;// 点读状态(默认笔)
let cachedBookId;
let cachedPageId;
let cachedUnitName;
let mouseOrPenTime = 0;

// 窗口
let mainWindow = null;
let loadingWindow = null;
let noticeWindow =null;

const appVersion = app.getVersion();

// 定义一些全局变量
global.globalDatas = {
  isOneAct:true, //是否是统一授权模式
  oneActInfo:storeAPI.getObject('oneActInfo') || {},
  processes: [],
  loadFlag: 1, //是否从loading页面进入
  loadTime:new Date(),  //启动云宝贝的时间
  updateAppInfo:null, //版本更新信息
  netReqUrl:netReqUrl,  //接口请求的地址
  installFlag:appVersion === storeAPI.get('appVersion') , //是否是新版本
  stemDowning:[],
  stemPause:[],
  netWork:true, //网络状态
  updateFlag:false, //是否在版本更新下载
};

// 判断是否是新装版本，如果是，则清除本地登陆用户信息
if(appVersion !== storeAPI.get('appVersion')){
  storeAPI.set('appVersion',appVersion)
};

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')();
  const path = require('path');
  const p = path.join(__dirname, '..', 'app', 'node_modules');
  require('module').globalPaths.push(p);
}

app.on('ready', () => {

  createLoadingWindow();

  setupEventIPC();

  width = electron.screen.getPrimaryDisplay().workAreaSize.width;
  height = electron.screen.getPrimaryDisplay().workAreaSize.height;
});


// 扩展
const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ];

  return Promise
    .all(extensions.map(name => installer.default(installer[name], forceDownload)))
    .catch(console.log);
};

// 单实例启动
const isSecondInstance = app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    createMainWindow();
  }
});

if (isSecondInstance) {
  // alert('云宝贝已经运行，请不好重复启动。');
  app.quit();
}

// flash插件
// 指定 flash 路径，假定它与 main.js 放在同一目录中。
let pluginName;
switch (process.platform) {
  case 'win32':
    pluginName = 'pepflashplayer.dll';
    break;
  case 'darwin':
    pluginName = 'PepperFlashPlayer.plugin';
    break;
  case 'linux':
    pluginName = 'libpepflashplayer.so';
    break;
}

let pluginPath = null;

if (process.env.NODE_ENV === 'development') {
  pluginPath = path.join(__dirname, '../extra_res', pluginName);
} else {
  // const cur = process.cwd();
  pluginPath = path.join(__dirname, '../..', pluginName);
  // pluginPath = path.join('file://', cur, pluginName);
}

console.log(`plugin path ${pluginPath}`);

app.commandLine.appendSwitch('ppapi-flash-path', pluginPath);

// 可选：指定 flash 的版本，例如 v17.0.0.169
app.commandLine.appendSwitch('ppapi-flash-version', '29.0.0.113');

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  // localStorage.removeItem('window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


//创建loading窗口
function createLoadingWindow() {

  loadingWindow = new BrowserWindow({
    show: false,
    width: 960,
    minWidth: 768,
    height: 540,
    minHeight: 467,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: { webSecurity: false }
  });
  const loadingWindowURL = path.join('file://', __dirname, 'newWindow/loading.html');
  console.log(`loading window url ${loadingWindowURL}`);
  loadingWindow.loadURL(loadingWindowURL);

  loadingWindow.openDevTools();

  // load启动
  loadingWindow.webContents.on('did-finish-load', () => {
    console.log('loadingWindow did-finish-load')
    if (loadingWindow) {
      loadingWindow.show();
      loadingWindow.focus();
    };
    // createMainWindow();
  });

  // load窗口关闭时
  loadingWindow.on('closed', () => {
    loadingWindow = null;
  });

  //loading进程crashed时候的回调
  loadingWindow.on('crashed',(e,killed)=>{
    console.log('loadingWindow'+killed)
    console.log(e);
  })
}

// 获取load窗体传回来的状态，如果值为1，代表激活信息获取完毕，或者进度条加载完毕
let loadStatus;
ipcMain.on('loadStatus', (event, arg) => {
  console.log(arg);
  loadStatus = arg;
  if(arg === '1' && !mainWindow){
    createMainWindow()
  }
});

//创建主窗体
function createMainWindow() {
  mainWindow = new BrowserWindow({
    show: false,
    width,
    minWidth: 768,
    height,
    minHeight: 467,
    // resizable :false,
    frame: false,
    maxHeight: height,
    maxWidth: width,
    webPreferences: { webSecurity: false }
  });

  const mainWindowURL = path.join('file://', __dirname, 'app.html');
  console.log(`main window url ${mainWindowURL}`);
  mainWindow.loadURL(mainWindowURL);

  mainWindow.on('closed', () => {
    // console.log("main窗口即将关闭");
    mainWindow = null;
    app.quit();
  });


  setupDevelopmentEnvironment();

  // 窗体加载完成的回调
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('"mainWindow" is defined');
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }

    // 主窗体准备就绪后，销毁load窗体
    if(loadingWindow) {
      if (loadingWindow.hide()) {
        loadingWindow.hide();
      }
      if (loadingWindow.destroy()) {
        loadingWindow.destroy();
      }
      loadingWindow = null;
    }

    mainWindow.show();
    mainWindow.focus();

    updateHandle();
    setupWindowMessageHooker();
  });

  // 窗体crash的回调
  mainWindow.on('crashed',(e,killed)=>{
    console.log('mainWindow'+killed)
    console.log(e);
  })


  // autoUpdater.setFeedURL("http://qncdn.yunbaobei.com/js_app/v207/");
  // autoUpdater.checkForUpdates();
}

function setupEventIPC() {
  // 退出
  ipcMain.on('window-all-closed', () => {
    platformAPI.killAllProcess(processes_running);
    setTimeout(() => {
      app.quit();
    }, 400);
  });


  // 小化
  ipcMain.on('hide-window', () => {
    console.log('hide-window');
    if (mainWindow) { mainWindow.minimize(); }
  });
}

function setupWindowMessageHooker() {

  console.log('hook message done');

  // 拦截DataCopyMessage， 鉴权，启动摄像头
  const WM_COPYDATA = 0x004A;
  mainWindow.hookWindowMessage(WM_COPYDATA, onWindowCopyData);
}


function onWindowCopyData(wParam, lParam) {
  console.log(`onWindowCopyData ${typeof wParam} ${typeof lParam}`);

  // if( message->message == WM_COPYDATA ) {
  //   // extract the string from lParam
  //   COPYDATASTRUCT * data = (COPYDATASTRUCT *) message->lParam;
  //
  //   emit eventData(QString::fromAscii((const char *)data->lpData, data->cbData));
  //
  //   // keep the event from qt
  // *result = 0;
  //   return true;
  // }
  let flagType = ref.types.uint32;
  if (process.arch === 'x64') {
    flagType = ref.types.uint64;
  }

  const COPYDATASTRUCT = refStruct({
    dwData: flagType,
    cbData: ref.types.int32,
    lpData: ref.types.CString
  });

  const COPYDATAPTR = ref.refType(COPYDATASTRUCT);

  lParam.type = COPYDATAPTR;
  const dataStructPtr = lParam.deref();

  const dataStruct = dataStructPtr.deref();

  const lpData = dataStruct.lpData;


  console.log(`dwdata ${dataStruct.dwData} \ncbdata ${dataStruct.cbData} \nlpData ${lpData}`);

  mainWindow.webContents.send('windowhook',`dwdata ${dataStruct.dwData} \ncbdata ${dataStruct.cbData} \nlpData ${lpData}`);

  if(dataStruct.dwData === parseInt(0xF001.toString(10))){ //与柏然的通信，主题课程中AR识别，调取摄像头
    platformAPI.startCamera(lpData)
  }

  // TODO : 万趣，柏然的通信协议，入口
  // 这里可以根据三个参数做对应的处理。然后通过SendWindowMessage发回去。
  // 通常情况下来说，lpData内是一段json
  // 详询王诗禹
}


let processes_running = [];

ipcMain.on('run-processes', (err, args) => {
  processes_running = args;
});

app.on('before-quit', (event) => {
  // event.preventDefault()
  console.log(processes_running);

  platformAPI.killAllProcess(processes_running);
});


// 开发者工具
function setupDevelopmentEnvironment() {
  if(!process.env.NODE_ENV === 'development'){
    return
  };
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    mainWindow.openDevTools();
  }
  mainWindow.webContents.on('context-menu', (e, props) => {
    const { x, y } = props;

    Menu
      .buildFromTemplate([{
        label: 'Inspect element',
        click: () => {
          mainWindow.inspectElement(x, y);
        }
      }])
      .popup(mainWindow);
  });
}


//-------------------------------------------------------------------
// Auto updates
//
// For details about these events, see the Wiki:
// https://github.com/electron-userland/electron-builder/wiki/Auto-Update#events
//
// The app doesn't need to listen to any events except `update-downloaded`
//
// Uncomment any of the below events to listen for them.  Also,
// look in the previous section to see them being used.
//-------------------------------------------------------------------

ipcMain.on('updateAppUrl', (event, arg) => {
  console.log(arg);

  autoUpdater.setFeedURL(arg);

  if(!(process.env.NODE_ENV === 'development')){
    autoUpdater.checkForUpdates();
  };
});

function updateHandle() {
  console.log('setup autoUpdater');
  const getdata = {
    detail: '当前已是最新版本'
  };// 通讯数据
  const appName = '云宝贝传统文化';
  // let appIcon= path.join( __dirname , 'resources/icon.ico');
  const message = {
    error: '当前已是最新版本',
    checking: '正在检查更新……',
    updateAva: '下载更新成功',
    updateNotAva: '现在使用的就是最新版本，不用更新',
    downloaded: '最新版本已下载，将在重启程序后更新'
  };


  const server = 'http://pclgv6.update.yunbaobei.com';

  // /download/:version/:platform/:filename
  // const server = 'http://localhost:8000';
  //// "url": "http://pcv6.update.yunbaobei.com/"
  // let feed = `${server}/official/${process.arch}`;
  // console.log(`updater ready at ${feed}`);
  //

  // 更新出错
  autoUpdater.on('error', (message) => {
    global.globalDatas.updateFlag = false;
    sendUpdateMessage('error', message);
  });

  autoUpdater.on('checking-for-update', (message) => {
    sendUpdateMessage('checking-for-update', message);
  });

  // 是最新
  autoUpdater.on('update-not-available', (message) => {
    sendUpdateMessage('update-not-available', message);
  });

   // 更新下载进度事件
   autoUpdater.on('download-progress', function (message) {
     global.globalDatas.updateFlag = true;
    sendUpdateMessage('download-progress', message);
  })

  // 已下载，将在重启
  autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) => {
    sendUpdateMessage('isUpdateNow',message.downloaded);
    ipcMain.on('updateNow', (e, arg) => {
        autoUpdater.quitAndInstall();
    });
  });

  // 通过main进程发送事件给renderer进程，提示更新信息
  function sendUpdateMessage(type, data) {
    mainWindow.webContents.send('version-update', { type, data });
  }

}


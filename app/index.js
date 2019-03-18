import React from 'react';
import ReactDOM from 'react-dom';
import {remote ,ipcRenderer ,webFrame} from 'electron';
import { AppContainer } from 'react-hot-loader';
import Root from './containers/Root';
import { configureStore, history } from './store/configureStore';
import { platformAPI } from './api/platform_api';
import storeAPI from './api/storeAPI';
import cookie from  './cookie/cookie';
import './app.global.css';
// import registerServiceWorker from './registerServiceWorker';


const store = configureStore();

window.platformAPI = platformAPI;
window.storeAPI = storeAPI;
window.cookie = cookie;

window.processes=remote.getGlobal('globalDatas').processes;

require('electron').webFrame.setZoomLevelLimits(1,1);

// 试验热更新start
const root = document.getElementById('root');
const render = () => {
    const renderMethod=module.hot ?  ReactDOM.render :ReactDOM.hydrate;
    renderMethod(
      <AppContainer>
        <Root store={store} history={history} />
      </AppContainer>,
      root
    )
};
render();
if(module.hot) {
  module.hot.accept('./containers/Root', () => {
    const NextApp = require('./containers/Root').default //因为在App里使用的是export default语法，这里使用的是require,默认不会加载default的，所以需要手动加上
        render(NextApp) // 重新渲染到 document 里面
  });
}

// 试验热更新之前
// ReactDOM.render (
//   <AppContainer>
//     <Root store={store} history={history} />
//   </AppContainer>,
//   document.getElementById('root')
// );

// if (module.hot) {
//   module.hot.accept('./containers/Root', () => {
//     const NextRoot = require('./containers/Root'); // eslint-disable-line global-require
//     ReactDOM.render (
//       <AppContainer>
//         <NextRoot store={store} history={history} />
//       </AppContainer>,
//       document.getElementById('root')
//     );
//   });
// }







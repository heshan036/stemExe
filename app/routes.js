/* eslint flowtype-errors/show-errors: 0 */
import React from 'react';
// import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Switch, Route, Redirect } from 'react-router';
import {remote} from 'electron';
// import Switch from 'react-router';
// import Route from 'react-router';
import App from './containers/App';
import HomePage from './containers/HomePage';
import ThemeCourse from './components/themeCourse';
import ScanCode from './components/scanCode';
import SystemInfo from './components/systemInfo';


export default () => (
  <App>
    <Switch>
      <Route path="/homePage" component={HomePage} />
      <Route path="/themeCourse" component={ThemeCourse} />
      <Route path="/systemInfo" component={SystemInfo} />
      <Route path="/scanCode" component={ScanCode} />
      <Route path="/" component={HomePage} />
    </Switch>
  </App>
);

  

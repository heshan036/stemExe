/* eslint flowtype-errors/show-errors: 0 */
import React from 'react';
import { Switch, Route, Redirect } from 'react-router';
import {remote} from 'electron';
import App from './containers/App';
import HomePage from './containers/HomePage';
import ScanCode from './components/scanCode';
import SystemInfo from './components/systemInfo';
import StemCourse from './components/stemCourse';


export default () => (
  <App>
    <Switch>
      <Route path="/homePage" component={HomePage} />
      <Route path="/stemCourse/:categary" component={StemCourse} />
      <Route path="/systemInfo" component={SystemInfo} />
      <Route path="/scanCode" component={ScanCode} />
      <Route path="/" component={HomePage} />
    </Switch>
  </App>
);

  

import React, { Component } from 'react';
import { Menu } from 'antd';
import { history } from '../../store/configureStore';
import './sideBar.global.css';

const MenuItem = Menu.Item;

class SideBar extends Component {
  constructor(props) {
    super(props);
    this.menuSelect = this.menuSelect.bind(this);
  }
  menuSelect=(key) => {
    this.props.menuToggle(key);
  }
  render() {
    return (
      <div className="sideBar">
        <a onClick={() => history.goBack()} className="backCircle">
          <i className="iconfont icon-fanhui fvw48" />
        </a>
        <Menu onSelect={this.menuSelect} defaultSelectedKeys={['0']}>
          {this.props.pageType != 'playClass_unit' && <MenuItem key="0" style={{marginBottom:0}}>全部</MenuItem>}
          {this.props.menuList.length > 0 && this.props.menuList.map(item => (
            <MenuItem key={item.categoryId} style={{marginBottom:0}}>{item.categoryName}</MenuItem>
              ))}
        </Menu>
      </div>
    );
  }
}

export default SideBar;

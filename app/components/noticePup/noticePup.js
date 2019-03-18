import React, { Component } from 'react';
import {Modal,Card,Button} from 'antd';
import {ipcRenderer } from 'electron';
import cookie from '../../cookie/cookie';
import Util from '../../api/util';
import PropTypes from "prop-types";
const { Meta } = Card;

class NoticePup extends Component{
    static propTypes = {
        noticeInfo:PropTypes.object.isRequired,
        noticeType:PropTypes.string.isRequired,
        setPropsStateValue:PropTypes.func.isRequired
    }

    constructor(props){
        super(props);
        console.log(props)
        this.state={
            
        };
        this.noticeSure = this.noticeSure.bind(this);
        this.playVideo = this.playVideo.bind(this)
    }

    componentDidMount(){
        console.log(this.props.noticeInfo.nowTime > "15:30")
    }

    noticeSure(){
        event.preventDefault();
        const fixedTime = "15:30";
        const noticeInfo = this.props.noticeInfo;
        let nowDay = noticeInfo.nowDay;
        let nowTime = noticeInfo.nowTime;
        // value为“1”代表3点30以前，value为“2”代表3点30以后
        if(Util.compareTime(nowTime,fixedTime)){
            cookie.setCookie(nowDay,"2",1)
        }else{
            cookie.setCookie(nowDay,"1",1)
        };
        this.props.setPropsStateValue("noticeModalVisible",false);
    }

    playVideo(){
        const {noticeInfo} = this.props;
        cookie.setCookie(nowDay,"2",1);
        ipcRenderer.send("playVideo",{title:noticeInfo.title,id: noticeInfo.progressPlan,type: 0});
    }

    render(){
        const {noticeInfo} = this.props;
        return(
            <div className="noticeModal">
                {this.props.children}
                {noticeInfo.startFlag ? 
                    <div className="tc">
                        <Button type="primary"  style={{height:"4.167vw",marginRight:"8%",width:"46%"}} onClick={() => this.playVideo()}>立即观看</Button>
                        <Button type="default"  style={{height:"4.167vw",width:"46%"}} onClick={this.noticeSure}>下次再看</Button>
                    </div>:
                    <Button type="primary" className="blockBtn" style={{height:"4.167vw"}} onClick={this.noticeSure}>我知道了</Button>
                }
            </div>
        )
    }
}

export default NoticePup
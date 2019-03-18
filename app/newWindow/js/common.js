var URL_BEFORE = "http://imgybs.yunbaobei.com/";

Date.prototype.format = function(format) {
    var o = {
        //month
        "M+": this.getMonth() + 1,
        //day
        "d+": this.getDate(),
        //hour
        "h+": this.getHours(),
        //minute
        "m+": this.getMinutes(),
        //second
        "s+": this.getSeconds(),
        //quarter
        "q+": Math.floor((this.getMonth() + 3) / 3),
		//millisecond
        "S": this.getMilliseconds()
    };
    format = format ? format : 'yyyy-MM-dd';
    if (/(y+)/.test(format))
        format = format.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
        if (new RegExp("(" + k + ")").test(format))
            format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
    return format;
};
Date.prototype.add = function(day){
	var time = this.getTime() + day * 24 * 3600 * 1000;
	var date = new Date(time);
	return date;
}

;(function(){
	template.helper('imgFormat', function (img) {
		return URL_BEFORE + img;
	});

	/**
	 * 对日期进行格式化，
	 * @param date 要格式化的日期
	 * @param format 进行格式化的模式字符串
	 *     支持的模式字母有：
	 *     y:年,
	 *     M:年中的月份(1-12),
	 *     d:月份中的天(1-31),
	 *     H:小时(0-23),
	 *     m:分(0-59),
	 *     s:秒(0-59),
	 *     S:毫秒(0-999),
	 *     q:季度(1-4)
	 * @return String
	 * @author yanis.wang
	 * @see	http://yaniswang.com/frontend/2013/02/16/dateformat-performance/
	 */
	template.helper('dateFormat', function (date, format) {

	    if (typeof date === "string") {
	        var mts = date.match(/(\/Date\((\d+)\)\/)/);
	        if (mts && mts.length >= 3) {
	            date = parseInt(mts[2]);
	        }
	    }
	    date = new Date(date);
	    if (!date || date.toUTCString() == "Invalid Date") {
	        return "";
	    }

	    var map = {
	        "M": date.getMonth() + 1, //月份
	        "d": date.getDate(), //日
	        "H": date.getHours(), //小时
	        "m": date.getMinutes(), //分
	        "s": date.getSeconds(), //秒
	        "q": Math.floor((date.getMonth() + 3) / 3), //季度
	        "S": date.getMilliseconds() //毫秒
	    };

	    format = format.replace(/([yMdHmsqS])+/g, function(all, t){
	        var v = map[t];
	        if(v !== undefined){
	            if(all.length > 1){
	                v = '0' + v;
	                v = v.substr(v.length-2);
	            }
	            return v;
	        }
	        else if(t === 'y'){
	            return (date.getFullYear() + '').substr(4 - all.length);
	        }
	        return all;
	    });
	    return format;
	});
})();

/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

/*
 * Generate a random uuid.
 *
 * USAGE: Math.uuid(length, radix)
 *   length - the desired number of characters
 *   radix  - the number of allowable values for each character.
 *
 * EXAMPLES:
 *   // No arguments  - returns RFC4122, version 4 ID
 *   >>> Math.uuid()
 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
 *
 *   // One argument - returns ID of the specified length
 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
 *   "VcydxgltxrVZSTV"
 *
 *   // Two arguments - returns ID of the specified length, and radix. (Radix must be <= 62)
 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
 *   "01001010"
 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
 *   "47473046"
 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
 *   "098F4D35"
 */
(function() {
  // Private array of chars to use
  var CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');

  Math.uuid = function (len, radix) {
    var chars = CHARS, uuid = [], i;
    radix = radix || chars.length;

    if (len) {
      // Compact form
      for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
      // rfc4122, version 4 form
      var r;

      // rfc4122 requires these characters
      uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
      uuid[14] = '4';

      // Fill in random data.  At i==19 set the high bits of clock sequence as
      // per rfc4122, sec. 4.1.5
      for (i = 0; i < 36; i++) {
        if (!uuid[i]) {
          r = 0 | Math.random()*16;
          uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
        }
      }
    }

    return uuid.join('');
  };

  // A more performant, but slightly bulkier, RFC4122v4 solution.  We boost performance
  // by minimizing calls to random()
  Math.uuidFast = function() {
    var chars = CHARS, uuid = new Array(36), rnd=0, r;
    for (var i = 0; i < 36; i++) {
      if (i==8 || i==13 ||  i==18 || i==23) {
        uuid[i] = '-';
      } else if (i==14) {
        uuid[i] = '4';
      } else {
        if (rnd <= 0x02) rnd = 0x2000000 + (Math.random()*0x1000000)|0;
        r = rnd & 0xf;
        rnd = rnd >> 4;
        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
      }
    }
    return uuid.join('');
  };

  // A more compact, but less performant, RFC4122v4 solution:
  Math.uuidCompact = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  };
})();

/**
 * 显示弱提示文字
 *
 * @param message 文字
 * @param time    时间(长1，短0)
 */
function showToast(message, time){
	sharedYBWebApi.ui.showToast(message, time);
}

/**
 * url跳转
 * @param path 要跳转的相对路径
 * @param reuse: 是否复用已经存在的UI
 */
function appJumpToUrl(path, reuse){
	var url = getRealPath(path);
	if(!reuse) reuse = false;
	sharedYBWebApi.utils.navigateToUrl(url, reuse);
}

/**
 * 生成绝对路径
 * @param path
 * @returns {String}
 */
function getRealPath(path){
	var href = window.location.href;
	var pathname = window.location.pathname;
	var pathArr = pathname.split('/');
	pathArr[pathArr.length - 1] = path;
	var host = pathname == '/' ? href : href.substring(0, href.indexOf(pathname));
	var realPath = '';
	if(sharedYBWebApi.utils.getShellPlatform() == 'JS'){
		realPath = host + pathArr.join('/');
	}else{
		realPath = 'inapp' + host + pathArr.join('/');
	}
	return realPath;
}

/**
 * 从指定的url获取参数值
 * @param url
 * @param name
 * @returns
 */
function getParamFromUrl(url, name){
	var reg = new RegExp("(\\?|&)" + name + "=([^&]*)(&|$)");
	var r = url.match(reg);
	if(r!=null) return unescape(r[2]); return null;
}

/**
 * 获取url参数值
 * @param name
 * @returns
 */
function getUrlParam(name){

     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);
     console.log(r);
     if(r!=null)return  unescape(r[2]); return null;
}

/**
 * 获取url参数值
 * @param name
 * @returns
 */
function getDecodeUrlParam(name){
     var reg = new RegExp("(^|&)"+ name +"=([^&]*)(&|$)");
     var r = window.location.search.substr(1).match(reg);
     if(r!=null)return  decodeURI(r[2]); return null;
}



const Util=new Object();

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}


function formatTimestamp(timestamp,type,CHflag) {
  var date = new Date();
  date.setTime(timestamp);

  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()
  var hour = date.getHours()
  var minute = date.getMinutes()

  switch(type){
    case 'date':
      if(CHflag){
        return formatNumber(year) + "年" +formatNumber(month) + "月" + formatNumber(day)+'日';
      };
      return formatNumber(year) + "/" +formatNumber(month) + "/" + formatNumber(day);
    case 'time':
      return formatNumber(hour) + ":" + formatNumber(minute);
    default:
      return formatNumber(year) + "/" +formatNumber(month) + "/" + formatNumber(day) + " " + formatNumber(hour) + ":" + formatNumber(minute);
  }
}

function numberToChinese(num){
  const chnNumChar = ["零","一","二","三","四","五","六","七","八","九"];
  const chnUnitSection = ["","万","亿","万亿","亿亿"];
  const chnUnitChar = ["","十","百","千"];
  let strIns = '', chnStr = '';
  let unitPos = 0;
  let zero = true;
  while(num > 0){
      var v = num % 10;
      if(v === 0){
          if(!zero){
              zero = true;
              chnStr = chnNumChar[v] + chnStr;
          }
      }else{
          zero = false;
          strIns = chnNumChar[v];
          strIns += chnUnitChar[unitPos];
          chnStr = strIns + chnStr;
      }
      unitPos++;
      num = Math.floor(num / 10);
  }
  return chnStr;
}

//比较时间大小，格式为"hh:mm" ，如"12:00"
function compareTime(s1,s2){
  try{
    if(s1.indexOf(":") < 0 || s2.indexOf(":") < 0){
      console.log("格式不正确")
    }else{
      let s1_array = s1.split(":");
      let s2_array = s2.split(":");
      let s1_num = parseInt(s1_array[0]) * 3600 + parseInt(s1_array[1]) * 60 ;
      let s2_num = parseInt(s2_array[0]) * 3600 + parseInt(s2_array[1]) * 60 ;
      return s1_num > s2_num;
    }
  }catch(err){
    console.log(err)
    return true
  }
}


  Util.formatNumber=formatNumber;
  Util.formatTimestamp=formatTimestamp;
  Util.numberToChinese=numberToChinese;
  Util.compareTime = compareTime;

  export default Util


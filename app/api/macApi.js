import { K, U, windef } from 'win32-api'; // or {Kernel32, User32}
import ref from 'ref';
import ffi from 'ffi';
import refStruct from 'ref-struct';
var refArray = require('ref-array');

const knl32 = K.load();
const user32 = U.load(); // load all apis defined in lib/{dll}/api from user32.dll


// typedef long                          __time32_t;
// typedef __int64                       __time64_t;

const MAX_ADAPTER_DESCRIPTION_LENGTH  = 128; // arb.
const MAX_ADAPTER_NAME_LENGTH         = 256; // arb.
const MAX_ADAPTER_ADDRESS_LENGTH      = 8;  // arb.

const ERROR_BUFFER_OVERFLOW           = 111;


const UINT = ref.types.uint32;
const DWORD = ref.types.uint32;

let time_t = ref.types.uint32;
if (process.arch === 'x64') {
  time_t = ref.types.uint64;
}

function getAllMacAddress(){

  // typedef struct {
  //   char String[4 * 4];
  // } IP_ADDRESS_STRING, *PIP_ADDRESS_STRING, IP_MASK_STRING, *PIP_MASK_STRING;

  const IP_ADDRESS_STRING = refStruct({
    AdapterName : refArray(ref.types.char, 4*4),
  });

  const PIP_ADDRESS_STRING = ref.refType(IP_ADDRESS_STRING);
  const IP_MASK_STRING = IP_ADDRESS_STRING;
  const PIP_MASK_STRING = PIP_ADDRESS_STRING;


  // typedef struct _IP_ADDR_STRING {
  //   struct _IP_ADDR_STRING* Next;
  //   IP_ADDRESS_STRING IpAddress;
  //   IP_MASK_STRING IpMask;
  //   DWORD Context;
  // } IP_ADDR_STRING, *PIP_ADDR_STRING;

  const IP_ADDR_STRING = refStruct({
    Next        : ref.refType(ref.types.void  /*IP_ADDR_STRING*/),
    IpAddress   : IP_ADDRESS_STRING,
    IpMask      : IP_MASK_STRING,
    Context     : DWORD
  });

  const PIP_ADDR_STRING = ref.refType(IP_ADDR_STRING);

  const IP_ADAPTER_INFO = refStruct({
    Next        : ref.refType(ref.types.void  /*IP_ADDR_INFO*/),//指向链表中下一个适配器信息的指针
    ComboIndex  : DWORD,//预留值
    AdapterName : refArray(ref.types.char, MAX_ADAPTER_NAME_LENGTH + 4),//使用ANSI字符串表示的适配器名称
    Description : refArray(ref.types.char, MAX_ADAPTER_DESCRIPTION_LENGTH + 4),//使用ANSI字符串表示的适配器描述
    AddressLength   : UINT,//适配器硬件地址以字节计算的长度
    Address     : refArray(ref.types.char, MAX_ADAPTER_ADDRESS_LENGTH),//硬件地址以BYTE数组所表示
    Index       : DWORD,//适配器索引
    Type        : UINT,//适配器类型
    DhcpEnabled : UINT,//指定这个适配器是否开启DHCP
    CurrentIpAddress  : ref.refType(ref.types.void),
    IpAddressList     : IP_ADDR_STRING,
    GatewayList       : IP_ADDR_STRING,
    DhcpServer        : IP_ADDR_STRING,
    HaveWins    : ref.types.bool,
    PrimaryWinsServer       : IP_ADDR_STRING,
    SecondaryWinsServer        : IP_ADDR_STRING,
    LeaseObtained   : time_t,
    LeaseExpires   : time_t,
  });

  const IP_ADAPTER_INFO_ARRAY_TYPE = refArray(IP_ADAPTER_INFO);

  const MACHost = new ffi.Library('Iphlpapi', {
    GetAdaptersInfo: [
      windef.LONG, [IP_ADAPTER_INFO_ARRAY_TYPE, windef.PULONG]
    ]
  });

  var arrayLength = 1;
  const InfoSize = IP_ADAPTER_INFO.size;   /*sizeof(IP_ADAPTER_INFO)*/

  var stSize = ref.alloc('int');
  stSize.writeInt32LE(arrayLength * InfoSize);

  var infoArray = IP_ADAPTER_INFO_ARRAY_TYPE(arrayLength);

  // console.log(`array ok`);

  var nRel = MACHost.GetAdaptersInfo(infoArray, stSize);

  // console.log(`GetAdaptersInfo ${nRel} : ${stSize.deref()}`);

  if (ERROR_BUFFER_OVERFLOW == nRel)
  {
    //如果函数返回的是ERROR_BUFFER_OVERFLOW
    //则说明GetAdaptersInfo参数传递的内存空间不够,同时其传出stSize,表示需要的空间大小
    //这也是说明为什么stSize既是一个输入量也是一个输出量
    //释放原来的内存空间

    //重新申请内存空间用来存储所有网卡信息
    var aa = stSize.deref() / InfoSize;
    var arrayLength = Math.ceil(aa);
    // console.log(`new array length ${aa} -> ${arrayLength} after buffer overflow`);

    infoArray = IP_ADAPTER_INFO_ARRAY_TYPE(arrayLength);

    //再次调用GetAdaptersInfo函数,填充pIpAdapterInfo指针变量
    nRel = MACHost.GetAdaptersInfo(infoArray, stSize);

    // console.log(`again, GetAdaptersInfo ${nRel} : ${stSize.deref()}`);
  }

  var ret = [];
  if (0 == nRel)
  {
    //输出网卡信息
    //可能有多网卡,因此通过循环去判断
    for(var i = 0; i < infoArray.length; i++)
    {
      var infoObj = infoArray[i];

      var name = infoObj.AdapterName.buffer.readCString();
      var desc = infoObj.Description.buffer.readCString();
      var address = "";

      var AddressLength = infoObj.AddressLength;
      if(AddressLength <= infoObj.Address.length)
      for (var j = 0; j < AddressLength; j++)
      {
        var c = infoObj.Address.buffer.readUInt8(j);
        if (address.length){
          address += ":";
        };
        var number = ("00" + c.toString(16).toLowerCase());
        address += number.substring(number.length-2);
      }

      //console.log(`decode result \nn\t${name}\nd\t${desc}\na\t${address}`);

      if((desc.length || name.length) && address.length){
        ret.push({name,desc,address});
      }
    }
  }

  return ret;
}


export default getAllMacAddress;

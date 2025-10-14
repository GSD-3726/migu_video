import { userId } from "../config.js"
import { getDateString } from "./time.js"

const list = {
  // h5端修改频繁，现已失效
  "h5": {
    // 第11位字符
    "keys": "yzwxcdabgh",
    // 第5 8 14位字母对应下标0 1 3的字符
    "words": ['', 'y', '0', 'w'],
    // 第11位字符替换位置,从0开始
    "thirdReplaceIndex": 1,
    // 加密后链接后缀
    "suffix": "&sv=10000&ct=www"
  },
  "android": {
    "keys": "cdabyzwxkl",
    "words": ['v', 'a', '0', 'a'],
    "thirdReplaceIndex": 6,
    "suffix": "&sv=10004&ct=android"
  }
}

const importObj = {
  a: {
    a: (a, b, c) => { },
    b: (a) => { return 0 },
    c: () => { },
    d: (a, b, c, d) => { return 0 },
    e: (a) => { return 0 },
    f: (a, b, c, d, e) => { return 0 },
    g: (a, b) => { return 0 },
    h: (a, b) => { return 0 },
    i: (a) => { return 0 },
    j: (a, b, c, d, e) => { return 0 }
  }
}

/**
 * 加密url
 * @param {string} videoURL - 视频url
 * @param {Uint8Array} memoryView - 内存
 * @param {Function} getEncrypt - 加密方法
 * @returns {string} - 加密地址
 */
function encrypt(videoURL, memoryView, getEncrypt) {
  // 将地址写入内存
  let i;
  for (i = 0; i < videoURL.length; ++i) {
    memoryView[i] = videoURL.charCodeAt(i)
  }
  memoryView[i] = 0

  // 加密内存中的url
  let start = getEncrypt(0)

  // 从内存中读取加密后的url
  let encryptedURL = ""
  for (let i = start; memoryView[i] != 0; ++i) {
    encryptedURL += String.fromCharCode(memoryView[i])
  }
  return encryptedURL
}


/**
 * 初始化wasm
 * @param {string} masmURL - wasm地址
 * @returns {object} - wasm导出的内容
 */
async function initWasm(masmURL) {
  // 获取wasm文件
  let resp = await fetch(masmURL);
  // 初始化
  let { instance } = await WebAssembly.instantiateStreaming(resp, importObj)
  return instance.exports;
}



/**
 * 获取加密url
 * @param {object} exports - wasm导出的内容
 * @param {string} videoURL - 视频地址
 * @returns {string} - 播放地址
 */
function getEncryptURL(exports, videoURL) {
  // 获得内存
  const memory = exports.k
  const memoryView = new Uint8Array(memory.buffer)

  // 获取加密方法
  const getEncrypt = exports.m
  return encrypt(videoURL, memoryView, getEncrypt)
}


/**
 * h5端现已失效
 * 获取ddCalcu
 * 大致思路:把puData最后一个字符和第一个字符拼接，然后拼接倒数第二个跟第二个，一直循环，
 *     当第1 2 3 4次(从0开始)循环时需要插入特殊标识字符
 * 特殊字符:
 *     都是根据一些数字字符串的某一位的值对应某数组的值确定的，形如数组[数字字符串[第几位]],具体根据第几位每个版本都不一样
 *     第1次是根据userid确定的，未登录时为固定字母
 *     第2位是根据时间戳确定(需要yyyyMMddhhmmss格式)
 *     第3根据节目id
 *     第4是根据平台确定的
 * @param {string} puData - 服务器返回的那个东东
 * @param {string} programId - 节目ID
 * @param {string} clientType - 平台类型 h5 android
 * @param {string} rateType - 清晰度 2:标清 3:高清 4:蓝光
 * @returns {string} - ddCalcu
 */
function getddCalcu(puData, programId, clientType, rateType) {

  if (puData == null || puData == undefined) {
    return ""
  }

  if (programId == null || programId == undefined) {
    return ""
  }

  if (clientType != "android" && clientType != "h5") {
    return ""
  }

  if (rateType == null || rateType == undefined) {
    return ""
  }

  // words第1位是根据userId的第7位(从0开始)数字对应keys里的字母生成的
  // 不登录标清是默认v
  const id = userId ? userId : process.env.USERID
  if (id) {
    const words1 = list.android.keys[id[7]]
    list.android.words[0] = words1
    list.h5.words[0] = words1
  }

  let keys = list[clientType].keys
  let words = list[clientType].words
  const thirdReplaceIndex = list[clientType].thirdReplaceIndex
  // android平台标清
  if (clientType == "android" && rateType == "2") {
    words[0] = "v"
  }
  const puDataLength = puData.length
  let ddCalcu = []
  for (let i = 0; i < puDataLength / 2; i++) {

    ddCalcu.push(puData[puDataLength - i - 1])
    ddCalcu.push(puData[i])
    switch (i) {
      case 1:
        ddCalcu.push(words[i - 1])
        break;
      case 2:
        ddCalcu.push(keys[parseInt(getDateString(new Date())[0])])
        break;
      case 3:
        ddCalcu.push(keys[programId[thirdReplaceIndex]])
        break;
      case 4:
        ddCalcu.push(words[i - 1])
        break;
    }
  }
  return ddCalcu.join("")
}

/**
 * 加密链接
 * @param {string} puDataURL - 加密前链接
 * @param {string} programId - 节目ID
 * @param {string} clientType - 客户端类型 h5 android
 * @param {string} rateType - 清晰度 2:标清 3:高清 4:蓝光
 * @returns {string} - 加密链接
 */
function getddCalcuURL(puDataURL, programId, clientType, rateType) {

  if (puDataURL == null || puDataURL == undefined) {
    return ""
  }

  if (programId == null || programId == undefined) {
    return ""
  }

  if (clientType != "android" && clientType != "h5") {
    return ""
  }

  if (rateType == null || rateType == undefined) {
    return ""
  }

  const puData = puDataURL.split("&puData=")[1]
  const ddCalcu = getddCalcu(puData, programId, clientType, rateType)
  const suffix = list[clientType].suffix

  return `${puDataURL}&ddCalcu=${ddCalcu}${suffix}`
}


/**
 * 旧版720p ddcalcu
 * @param {string} puData - 服务器返回的那个东东
 * @param {string} programId - 节目ID
 * @returns {string} - ddCalcu
 */
function getddCalcu720p(puData, programId) {

  if (puData == null || puData == undefined) {
    return ""
  }

  if (programId == null || programId == undefined) {
    return ""
  }

  const keys = "0123456789"

  let ddCalcu = []
  for (let i = 0; i < puData.length / 2; i++) {

    ddCalcu.push(puData[puData.length - i - 1])
    ddCalcu.push(puData[i])
    switch (i) {
      case 1:
        // ddCalcu.push(token=="" ?"e":keys[] )
        ddCalcu.push("e")
        break;
      case 2:
        ddCalcu.push(keys[parseInt(getDateString(new Date())[6])])
        break;
      case 3:
        ddCalcu.push(keys[programId[2]])
        break;
      case 4:
        ddCalcu.push("0")
        break;
    }
  }
  return ddCalcu.join("")
}

/**
 * 旧版720p加密链接
 * @param {string} puDataURL - 加密前链接
 * @param {string} programId - 节目ID
 * @returns {string} - 加密链接
 */
function getddCalcuURL720p(puDataURL, programId) {

  if (puDataURL == null || puDataURL == undefined) {
    return ""
  }

  if (programId == null || programId == undefined) {
    return ""
  }

  const puData = puDataURL.split("&puData=")[1]
  const ddCalcu = getddCalcu720p(puData, programId)

  return `${puDataURL}&ddCalcu=${ddCalcu}`
}

export { initWasm, getEncryptURL, getddCalcuURL, getddCalcuURL720p }

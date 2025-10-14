import { dataList } from "./utils/fetchList.js"
import { getAndroidURL } from "./utils/androidURL.js"
import refreshToken from "./utils/refreshToken.js"
import { appendFile, appendFileSync, renameFileSync, writeFile } from "./utils/fileUtil.js"
import { updatePlaybackData } from "./utils/playback.js"
import { printBlue, printGreen, printMagenta, printRed, printYellow } from "./utils/colorOut.js"
import { token as config_token, userId as config_userId } from "./config.js"

async function fetchURLByAndroid() {

  const userId = process.env.USERID || config_userId
  const token = process.env.MIGU_TOKEN || config_token

  const date = new Date()
  const start = date.getTime()

  // 获取数据
  const datas = await dataList()

  // 必须绝对路径
  const path = process.cwd() + '/interface.txt.bak'
  // 创建写入空内容
  writeFile(path, "")

  // 回放
  const playbackFile = process.cwd() + '/playback.xml.bak'
  writeFile(playbackFile,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<tv generator-info-name="Tak" generator-info-url="https://github.com/develop202/migu_video/">\n`)

  if (!date.getHours()) {
    // 0点刷新token
    await refreshToken(userId, token) ? printGreen("token刷新成功") : printRed("token刷新失败")
  }

  // 写入开头
  // appendFile(aptvPath, `#EXTM3U x-tvg-url="https://gitee.com/dream-deve/migu_video/raw/main/playback.xml" catchup="append" catchup-source="&playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"\n`)
  appendFile(path, `#EXTM3U x-tvg-url="https://develop202.github.io/migu_video/playback.xml,https://raw.githubusercontent.com/develop202/migu_video/refs/heads/main/playback.xml,https://gh-proxy.com/https://raw.githubusercontent.com/develop202/migu_video/refs/heads/main/playback.xml" catchup="append" catchup-source="&playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"\n`)

  // 分类列表
  for (let i = 0; i < datas.length; i++) {
    printBlue(`分类###:${datas[i].name}`)

    const data = datas[i].dataList
    // 写入节目
    for (let j = 0; j < data.length; j++) {

      printMagenta(`${data[j].name}：`)
      const res = await updatePlaybackData(data[j], playbackFile)
      if (res) {
        printGreen(`    节目单更新成功`)
      } else {
        printRed(`    节目单更新失败`)
      }

      // 获取链接
      const resObj = await getAndroidURL(userId, token, data[j].pID, 4)
      if (resObj.url == "") {
        printRed(`    节目调整，暂不提供服务`)
        continue
      }

      // 写入节目
      appendFile(path, `#EXTINF:-1 svg-id="${data[j].name}" svg-name="${data[j].name}" tvg-logo="${data[j].pics.highResolutionH}" group-title="${datas[i].name}",${data[j].name}\n${resObj.url}\n`)
      printGreen(`    节目链接更新成功`)
    }
  }

  appendFileSync(playbackFile, `</tv>\n`)

  renameFileSync(playbackFile, playbackFile.replace(".bak", ""))
  renameFileSync(path, path.replace(".bak", ""))
  const end = Date.now()
  printYellow(`本次耗时:${(end - start) / 1000}秒`)
}

fetchURLByAndroid()

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import path from 'node:path'
import axios from 'axios'
import { CONSTANTS, renderError } from '../utils/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const readTemplateFile = (theme) =>
  readFileSync(path.resolve(__dirname, `../template/${theme}.ejs`), 'utf-8')

const aesEncrypt = (secKey, text) => {
  const cipher = crypto.createCipheriv('AES-128-CBC', secKey, '0102030405060708')
  return cipher.update(text, 'utf-8', 'base64') + cipher.final('base64')
}

const aesRsaEncrypt = (text) => ({
  params: aesEncrypt('TA3YiYCfY2dDJQgg', aesEncrypt('0CoJUm6Qyw8W8jud', text)),
  encSecKey:
    '84ca47bca10bad09a6b04c5c927ef077d9b9f1e37098aa3eac6ea70eb59df0aa28b691b7e75e4f1f9831754919ea784c8f74fbfadf2898b0be17849fd656060162857830e241aba44991601f137624094c114ea8d17bce815b0cd4e5b8e2fbaba978c6d1d14dc3d1faf852bdd28818031ccdaaa13a6018e1024e2aae98844210',
})

const templateColorVariants = {
  list: {
    light: { bgColor: '#f6f8fa', fontColor: '#161b22', itemBgColor: '#000000' },
    dark: { bgColor: '#212121', fontColor: '#f4f4f4', itemBgColor: '#ffffff' },
  },
  card: {
    light: { bgColor: '#f6f8fa', songColor: '#161b22', artistColor: '#737373' },
    dark: { bgColor: '#121212', songColor: '#ffffff', artistColor: '#b3b3b3' },
  },
}

export default async (req, res) => {
  try {
    const { id, limit = 5, cache = CONSTANTS.CACHE_FOUR_HOURS } = req.query
    if (!id) throw new Error('Id is required')

    const {
      data: { allData, weekData },
    } = await axios.post(
      'https://music.163.com/weapi/v1/play/record?csrf_token=',
      aesRsaEncrypt(JSON.stringify({ uid: id, type: '1' })),
      {
        headers: {
          Accept: '*/*',
          'Accept-Encoding': 'gzip,deflate,sdch',
          'Accept-Language': 'zh-CN,en-US;q=0.7,en;q=0.3',
          Connection: 'keep-alive',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          Host: 'music.163.com',
          Referer: 'https://music.163.com/',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
        },
      }
    )

    const songs = (weekData ?? allData).slice(0, parseInt(limit))

    const result = songs.map(({ song, playTime }) => ({
      name: song.name,
      artist: song.ar.map(({ name }) => name).join('/'),
      album: song.al.name,
      time: playTime,
      url: `https://music.163.com/#/song?id=${song.id}`,
    }))

    res.setHeader(
      'Cache-Control',
      `public, max-age=${Math.max(
        CONSTANTS.CACHE_FOUR_HOURS,
        Math.min(parseInt(cache), CONSTANTS.CACHE_ONE_DAY)
      )}`
    )
    res.setHeader('content-type', 'application/json')
    res.statusCode = 200
    res.json({ recentPlayed: result })
  } catch (err) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.statusCode = 400
    res.json({ error: err.message })
  }
}

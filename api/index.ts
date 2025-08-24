import crypto from 'node:crypto'
import axios from 'axios'

interface SongInfoItem {
  name: string
  artist: string
  album: string
  pic: string
  id: number
  url: string
  time?: number
}

const CONSTANTS = {
  CACHE_FOUR_HOURS: 14400,
  CACHE_ONE_DAY: 86400,
}

function aesEncrypt(secKey: string, text: string) {
  const cipher = crypto.createCipheriv('AES-128-CBC', secKey, '0102030405060708')
  return cipher.update(text, 'utf-8', 'base64') + cipher.final('base64')
}

function aesRsaEncrypt(text: string) {
  return {
    params: aesEncrypt('TA3YiYCfY2dDJQgg', aesEncrypt('0CoJUm6Qyw8W8jud', text)),
    encSecKey:
    '84ca47bca10bad09a6b04c5c927ef077d9b9f1e37098aa3eac6ea70eb59df0aa28b691b7e75e4f1f9831754919ea784c8f74fbfadf2898b0be17849fd656060162857830e241aba44991601f137624094c114ea8d17bce815b0cd4e5b8e2fbaba978c6d1d14dc3d1faf852bdd28818031ccdaaa13a6018e1024e2aae98844210',
  }
}

export default async (req: any, res: any) => {
  try {
    const { id, limit = 6, cache = CONSTANTS.CACHE_FOUR_HOURS, favoriteListId } = req.query
    if (!id && !favoriteListId)
      throw new Error('id or favoriteListId is required')

    // 获取最近播放
    let recentPlayed: SongInfoItem[] = []
    if (id) {
      const { data } = await axios.post(
        'https://music.163.com/weapi/v1/play/record?csrf_token=',
        aesRsaEncrypt(JSON.stringify({ uid: id, type: '1' })),
        {
          headers: {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip,deflate,sdch',
            'Accept-Language': 'zh-CN,en-US;q=0.7,en;q=0.3',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'music.163.com',
            'Referer': 'https://music.163.com/',
            'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
          },
        },
      )
      const weekData = data.weekData

      const songs = (weekData ?? []).slice(0, Number.parseInt(limit))
      recentPlayed = songs.map(({ song, playTime }: { song: any, playTime: number }) => ({
        name: song.name,
        artist: song.ar.map(({ name }: { name: string }) => name).join('/'),
        album: song.al.name,
        pic: song.al.picUrl,
        id: song.id,
        url: `https://music.163.com/#/song?id=${song.id}`,
        time: playTime,
      }))
    }

    let favoriteList = null
    if (favoriteListId) {
      try {
        const favRes = await axios.post(
          'https://music.163.com/api/v3/playlist/detail',
          `id=${favoriteListId}&n=1000&s=8`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer': 'https://music.163.com/',
              'User-Agent':
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
            },
          },
        )
        const favSongs = favRes.data.playlist.tracks.slice(0, Number.parseInt(limit))
        favoriteList = favSongs.map((song: any) => ({
          name: song.name,
          artist: song.ar.map(({ name }: { name: string }) => name).join('/'),
          album: song.al.name,
          pic: song.al.picUrl,
          id: song.id,
          url: `https://music.163.com/#/song?id=${song.id}`,
        }))
      }
      catch {
        favoriteList = []
      }
    }

    res.setHeader(
      'Cache-Control',
      `public, max-age=${Math.max(
        CONSTANTS.CACHE_FOUR_HOURS,
        Math.min(Number.parseInt(cache), CONSTANTS.CACHE_ONE_DAY),
      )}`,
    )
    res.setHeader('content-type', 'application/json')
    res.statusCode = 200
    res.json({ recentPlayed, favoriteList })
  }
  catch (err) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.statusCode = 400
    res.json({ error: (err as Error).message })
  }
}

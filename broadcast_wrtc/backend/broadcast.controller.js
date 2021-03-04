const httpStatus = require('http-status')
const BroadcastService = require('./bxb_broadcast')

function info (req, res, next) {
  try {
    const status = BroadcastService.getStatus()
    return res.status(httpStatus.OK).json(status)
  } catch (e) {
    debug(e)
    next(e)
  }
}

async function start (req, res, next) {
  const clientIp = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
  console.log(`ctrl ip format: ${clientIp}`);

  if (BroadcastService.status === 'busy')
    return res.status(httpStatus.BAD_REQUEST).json({message: 'Broadcast is busy.'})
  
  try {
    await BroadcastService.start({
      type: req.body.type || 'ws',
      area: req.body.area || [],
      sampleRate: req.body.sampleRate || 48000,
      user: {
        id: 1,
        ip: clientIp || '192.168.0.1'
      },
    })
    return res.status(httpStatus.OK).json({message: 'OK', peerId: BroadcastService.peerId})
  } catch (e) {
    console.log('start出錯');
    next(e)
  }
}

function stop (req, res, next) {
  try {
    if (BroadcastService.status === 'busy') {
      BroadcastService.stop()
    }
    return res.status(httpStatus.OK).json({message: 'OK'})
  } catch (e) {
    console.log('stop出錯');
    next(e)
  }
}

module.exports = { info, start, stop}
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

function start (req, res, next) {
  if (BroadcastService.status === 'busy')
    return res.status(httpStatus.BAD_REQUEST).json({message: 'Broadcast is busy.'})
  
  BroadcastService.start({
    type: req.body.type || 'ws',
    area: req.body.area || [],
    address: req.body.address || '192.168.0.1'
  })
  return res.status(httpStatus.OK).json({message: 'OK'})
}

function stop (req, res, next) {
  if (BroadcastService.status === 'busy') {
    BroadcastService.stop()
  }
  return res.status(httpStatus.OK).json({message: 'OK'})
}

module.exports = { info, start, stop}
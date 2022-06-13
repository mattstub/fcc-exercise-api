// https://github.com/gitdagray/express_routers/blob/main/middleware/errorHandler.js
// Middleware by Dave Gray

const { logEvents } = require('./logEvents')

const errorHandler = (err, req, res, next) => {
    logEvents(`${err.name}: ${err.message}`, 'errLog.txt')
    console.error(err.stack)
    res.status(500).send(err.message)
}

module.exports = errorHandler

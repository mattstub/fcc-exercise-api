const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const path = require('path')
const mongoose = require('mongoose')
const { Schema } = mongoose
const { logger } = require('./middleware/logEvents')
const errorHandler = require('./middleware/errorHandler')
const DB_URI = process.env['DB_URI']

require('dotenv').config()

mongoose.connect(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
})

const ExerciseUserSchema = new Schema({
  username: { type: String, unique: true },
})

const ExerciseSchema = new Schema({
  userID: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
})

const ExerciseUser = mongoose.model('ExerciseUser', ExerciseUserSchema)
const Exercise = mongoose.model('Exercise', ExerciseSchema)

app.use(logger)
app.use(errorHandler)
app.use(cors({ optionsSuccessStatus: 200 }))  // some legacy browsers buck at 204
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, '/public')))

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'))
})

app.get('/api/users', (req, res) => {
  ExerciseUser.find({}, (err, data) => {
    if (err || !data)
      res.send('Error Finding Users..')
    else
      res.json(data)
  })
})

app.post('/api/users', async (req, res) => {
  try {
    const newUser = new ExerciseUser({ username: req.body.username })
    const userExists = await ExerciseUser.findOne({ username: req.body.username }).exec()
    if (userExists)
      res.json({
        'username': userExists.username,
        '_id': userExists._id
      })
    else {  
      newUser.save((err, data) => {
        if (err || !data) 
          res.send('Error Saving User..')
        else
          res.json({
            username: data.username,
            _id: data._id
          })
      })
    }
  } catch (error) {
    console.error(error)
  }
})

app.post('/api/users/:id/exercises', (req, res) => {
  let tempDate = new Date(req.body.date)
  
  const id = req.params.id
  const { description, duration } = req.body
  
  ExerciseUser.findById(id, (err, userData) => {
    if(isNaN(tempDate))
      tempDate = new Date()
    if (err || !userData)
      res.send('Could not find user')
    else {
      const newExercise = new Exercise({
        userID: id,
        description,
        duration,
        date: tempDate
      })
      newExercise.save((err, data) => {
        if (err || !data)
          res.send('There was an error saving the exercise')
        else 
          res.json({
            username: userData.username,
            description: data.description,
            duration: data.duration,
            date: new Date(data.date).toDateString(),            
            _id: userData.id
          })
      })
    }
  })
})

app.get('/api/users/:id/logs', (req, res) => {
  const { from, to, limit } = req.query
  const { id } = req.params

  ExerciseUser.findById(id, (err, userData) => {
    if (err || !userData)
      res.send('Could not find user')
    else {
      let dateFilter = {}
      if (from)
        dateFilter['$gte'] = new Date(from)
      if (to)
        dateFilter['$lte'] = new Date(to)
      let filter = { userID: id }
      if (from || to)
        filter.date = dateFilter;

      let boundary = limit || 500
      
      Exercise.find(filter).limit(boundary).exec((err, data) => {
        if (err || !data)
          res.json([])
        else {
          const count = data.length
          const { username, _id } = userData
          const log = data.map((l) => ({
            description: l.description,
            duration: l.duration,
            date: new Date(l.date).toDateString()
          }))
          res.json({
            'username': username, 
            'count': count, 
            '_id': _id,
            'log': log
          })   
        }
      })
    }
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

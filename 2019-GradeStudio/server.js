const express = require('express')
const app = express()

const fileUpload = require('express-fileupload')
app.use(fileUpload())

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const fse = require('fs-extra')

const csvtojson = require('csvtojson')

var uniqid = require('uniqid')

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/uploadfile', function (req, res) {
  if (Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.')
  }

  // The name of the input field (i.e. "importfile") is used to retrieve the uploaded file
  let importfile = req.files.importfile

  if (importfile.mimetype !== 'text/csv') {
    res.status(403).sendFile(__dirname + '/views/403.html')
  }

  // Use the mv() method to place the file somewhere on your server
  importfile.mv(__dirname + '/data/input/' + req.files.importfile.name, function (err) {
    if (err) {
      return res.status(500).send(err)
    } else {
      console.log(importfile)
      console.log(uniqid())
      // console.log(importfile.data.toString('ascii'))
      fse.writeFile(__dirname + '/data/input/' + req.files.importfile.name, importfile.data, (err) => {
        if (err) {
          console.log(err)
        } else {
          console.log('The file has been saved!')
          const csvFilePath = __dirname + '/data/input/' + req.files.importfile.name
          csvtojson()
            .fromFile(csvFilePath)
            .then((jsonObj) => {
              fse.writeJson(__dirname + '/data/output/001.json', jsonObj)
                .then(() => {
                  console.log(__dirname + '/data/output/001.json saved')
                })
                .catch(err => {
                  console.error(err)
                })
            })
        }
      })
      res.redirect('/chart')
    }
  })
})

app.get('/chart', function (req, res) {
  res.sendFile(__dirname + '/views/chart.html')
})

app.use('*',function(req,res){
  res.sendFile(__dirname + '/views/404.html');
})

app.listen(3000, function () {
  console.log('2019-Grade-Studio Server Listening on Port 3000')
})

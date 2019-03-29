const express = require('express')
const bodyparser = require('body-parser') 
const app = express()
const port = 3000
const path = require("path")

const router = require("./src/rest")

/* console.log */

// app settings
app.use(bodyparser.json())
app.use(bodyparser.urlencoded({ extended: true }))

/* radical blaze */
app.use('/js', express.static('src'))
app.use('/static', express.static("public"))
app.use('/libs/', express.static("bower_components"))

app.use('/api/', router)

app.use(express.static(path.join(__dirname,'public')))

// error handler
app.get('/home', (req, res) => {
	res.sendFile(path.join(__dirname, "public", "home.html"))
})
/* start the server */
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
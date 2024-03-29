const express = require('express')
const app = express()
const port = 3000
const path = require("path")
/* app.use('/static', express.static(path.join(__dirname, 'public'))) */
//__filename
//__dirname

// app settings
app.use('/js', express.static('src'))
app.use('/static', express.static("public"))
app.use('/libs/', express.static("bower_components"))
app.use(express.static(path.join(__dirname,'public')))

// error handler
app.get('/home', (req, res) => {
	res.sendFile(path.join(__dirname, "public", "home.html"))
})
/* start the server */
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
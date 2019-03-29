const express = require("express")
const lodash = require("lodash")
const router = express.Router()
const uuid = require("uuid")

const app = express()
const STORE = []

router.use((req, res, next) => {
	console.log('Time:', Date.now())
	next()
})

/* rest */
router.get("/contents/node/:id", (req, response) => {
	response.send("You better know!")
})

/* rest */
router.put("/contents/node", (req, response) => {
	const data = JSON.parse(req.body.data)
	STORE.push(data)
	console.log("<...strange...>")
	console.log(data)
	return response.send(data)
})

router.post("/contents/node", (req, response) => {
	
	const data = JSON.parse(req.body.data)
	let result = null
	if (data) {
		data.uid = uuid()
		result = lodash.omit(data, ["__indexation__"])
	}
	
	result = lodash.set({}, "result", result)
	
	response.send(result)
})

module.exports = router

/* relations */
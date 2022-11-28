const express = require("express");
const router = express.Router();
const EventController = require('../controllers/event')

router.get("/", EventController.eventExtract);


  module.exports = router;

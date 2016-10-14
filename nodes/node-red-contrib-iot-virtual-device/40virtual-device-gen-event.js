/**
 * Copyright 2014, 2015, 2016 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

 module.exports = function(RED) {
 //	"use strict";
 	var deviceManager = require('./lib/deviceManager.js');
 	deviceManager(RED);
 	var _ = require("underscore");

	/*
	 * generate event node
	 */

	function generateEvent(n, schema, device, msg){
		var evtName = (msg.payload) ? msg.payload.deviceEvent : null;
		if(!evtName){
			try {
				evtName = _.indexBy(schema.evts, "guid")[n.evt].name;
			} catch (e) {
				throw new Error("Event name is undefined");
			}
		}
		var eventMsg = {
				deviceId: device.deviceId,
				deviceType: device.deviceType,
				eventOrCommandType: evtName,
				payload: {d: {}}
		};
		try {
			var evt = _.indexBy(schema.evts, "name")[eventMsg.eventOrCommandType];
			var propIndex = _.indexBy(schema.props, "guid");
			if(evt.payload){
				if(evt.payload.properties){
					_.each(evt.payload.properties, function(propId){
						var prp = propIndex[propId];
						eventMsg.payload.d[prp.name] = device.properties[prp.name];
					});
				}
				else if(evt.payload.fixedPayload)
					_.extend(eventMsg.payload.d, evt.payload.fixedPayload);
			}
		} catch (e) {
			n.warn("Cannot parse payload for " + eventMsg.eventOrCommandType);
		}

		_.extend(msg, eventMsg);
		n.send(msg);
	}

	function deviceEvent(n) {
		RED.nodes.createNode(this, n);
		this.deviceId = n.deviceId;
		this.schema = RED.nodes.getNode(n.schema);
		this.evt = n.evt;
		var node = this;
		this.on("input", function(msg) {
			var deviceId = (msg.payload && msg.payload.deviceId) ? msg.payload.deviceId : (msg.deviceId) ? msg.deviceId : node.deviceId;
			if(!deviceId)
				throw new Error("Device Id is undefined");
      var device = (node.schema) ? deviceManager.getDevice(node.schema.deviceType, deviceId) : deviceManager.getDevicebyId(deviceId);
    	if(!device){
				node.warn("Device " + deviceId + " is off");
				node.send(null);
			}
			else {
        var schema = (node.schema) ? node.schema : deviceManager.getSchema(device.deviceType);
				generateEvent(node, schema, device, msg);
			}
		});
	}

	RED.nodes.registerType("generate event", deviceEvent);



};

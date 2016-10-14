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
	 * start virtual device
	 */
	function createDevice(n) {

		RED.nodes.createNode(this, n);
		this.deviceId = n.deviceId;
		this.schema = RED.nodes.getNode(n.schema);
		if(!this.schema)
			this.error("Device Schema is undefined");
		this.createdDevices = [];
		var node = this;
		this.on("input", function(msg) {
			var deviceId = (msg.payload && msg.payload.deviceId) ? msg.payload.deviceId : (msg.deviceId) ? msg.deviceId : node.deviceId;
			if(!deviceId)
				throw new Error("Device Id is undefined");
      if(msg.payload.deviceType && msg.payload.deviceType !== node.schema.deviceType){
        node.warn("Mismatching Device Type " +  msg.payload.deviceType + " , message not proceeded");
				node.send(null);
        return;
      }
			var device = deviceManager.getDevice(node.schema.deviceType, deviceId);
			if(device){
				node.warn("Device " + deviceId + " already exist, message not proceeded");
				node.send(null);
			}
			else{
				device = deviceManager.createDevice(deviceId, node.schema, msg);
				if(!device){
					node.error("cannot start virtual device");
					node.send(null);
				}
				else{
					node.warn("Device " + deviceId + " created.");
					node.createdDevices.push(device);
					msg.payload = JSON.parse(JSON.stringify(device));//clone device
					node.send(msg);
				}
			}
		});

		this.on("close", function() {
			_.each(node.createdDevices, function(device){
				deviceManager.removeDevice(device);
				node.warn("Device " + device.deviceId + " deleted.");
			});

		});
	}
	RED.nodes.registerType("start virtual device", createDevice);



};

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
	 * Set device properties node
	 */

	function deviceProperties(n) {

		RED.nodes.createNode(this, n);
		this.deviceId = n.deviceId;
		this.schema = RED.nodes.getNode(n.schema);
		this.propAll = n.propAll;
		this.prop = n.prop;
		this.valueType = n.valueType;
		this.value = n.value;

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
				if(node.propAll){
					var msgPayload = msg.payload.d || msg.payload;
					_.each(msgPayload, function(val, propName){
						if(device.properties[propName] !== undefined)
							device.properties[propName] = val;
					});
				}
				else{// set specific property
					//at this stage we need a schema
					if(!node.schema){
						throw new Error("Schema is undefined");
					}
					var prpName = null;
					try {
						prpName = _.indexBy(node.schema.props, "guid")[node.prop].name;
					} catch (e) {
						throw new Error("Event name is undefined");
					}

					switch (node.valueType) {
					case "msg":
						device.properties[prpName] = RED.util.getMessageProperty(msg,node.value);
						break;
					case "flow":
						device.properties[prpName] = node.context().flow.get(node.value);
						break;
					case "global":
						device.properties[prpName] = node.context().global.get(node.value);
						break;
					case "date":
						device.properties[prpName] = Date.now();
						break;
					case "num":
						device.properties[prpName] = Number(node.value);
						break;
					case "bool":
						device.properties[prpName] = /^true$/i.test(node.value);
						break;
					case "json":
						try {
							device.properties[prpName] = JSON.parse(node.value);
						} catch(e) {
							node.error("invalid json");
						}
						break;
					default:
						device.properties[prpName] = node.value;
					}
				}
				msg.payload = JSON.parse(JSON.stringify(device));//clone device
				node.send(msg);
			}
		});
	}

	RED.nodes.registerType("set properties", deviceProperties);




};

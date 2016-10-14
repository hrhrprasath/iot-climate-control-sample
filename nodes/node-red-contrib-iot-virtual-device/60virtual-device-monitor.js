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



	function devicemonitor(n) {
		RED.nodes.createNode(this, n);
		var node = this;
		this.deviceId = n.deviceId;
		this.allDeviceIds = n.allDeviceIds;
		this.schema = RED.nodes.getNode(n.schema);
		this.allSchemas = n.allSchemas;
		this.allProps = n.allProps;
		this.monitor = n.monitor;
		this.monitorAll = n.monitorAll;
		this.props = [];
		if(!this.allSchemas && this.schema){
			var propsIndex = _.indexBy(this.schema.props, "guid");
			_.each(n.props, function(propId){
				if(propsIndex[propId])
					this.props.push(propsIndex[propId].name);
			}, this);
		}

		//resolve conflicting settings
		if(!this.schema && !this.allSchemas){
			this.warn("Schema is not set, listening to all schemas");
			this.allSchemas = true;
		}
		else if(!this.allSchemas && !this.allDeviceIds && this.deviceId === ""){
			this.warn("Device Id not set, listening to all devices");
			this.allDeviceIds = true;
		}
		if( (this.monitor === "property" || this.monitorAll) && !this.allSchemas && !this.allProps && this.props.length === 0){
			this.warn("Device properties not set, listening to all properties changes");
			this.allProps = true;
		}
		if(this.allSchemas){
			this.allProps = true;
			this.allDeviceIds = true;
		}

		//event handler
		var onDeviceEvent = function(ev){
			var evt = JSON.parse(JSON.stringify(ev));
			var msg = {topic: evt.topic};
			delete evt.topic;
			msg.payload = evt;
			if(msg.topic === "deviceSchema")
				msg = [msg];
			setTimeout( function() { node.emit("input",msg); }, 0 );
		};

		function setupSchemasEvents() {
			node.emit("input",{topic: "deviceSchemaStartup"});
			deviceManager.events.on("schemaAdded", onDeviceEvent);
			eventsTopics.push("schemaAdded");
		 }

		 var eventsTopics = [];
		if(this.monitorAll){
			eventsTopics = ["propertyChange",  "deviceCreated", "deviceDeleted"];
			setTimeout( setupSchemasEvents, 100 );
		}
		else if(this.monitor === "schema"){//monitor schemas - just inject on startup
			setTimeout(setupSchemasEvents, 100 );
		}
		else{//construct virtual device events topics
			var eventTopic = "";
			switch (this.monitor) {
			case "property":
				eventTopic = "propertyChange";
				break;
			case "start":
				eventTopic = "deviceCreated";
				break;
			case "stop":
				eventTopic = "deviceDeleted";
				break;
			default:
				throw new Error("Unknown Monitoring Type");
			}
			eventTopic += (this.allSchemas) ? "" : "-" + this.schema.deviceType;
			if(this.monitor !== "property"){
				eventsTopics.push(eventTopic);
			}
			else{// monitor properties
				if(this.allProps){
					eventsTopics.push(eventTopic);
				}
				else{
					_.each(this.props,function(prpName){
						eventsTopics.push(eventTopic + "-" + prpName);
					});
				}
			}
			//add deviceIds if needed
			if(!this.allDeviceIds){
				for (var i = 0; i < eventsTopics.length; i++) {
					eventsTopics[i] += "-" +  this.deviceId;
				}
			}
		}

		this.on("input",function(msg) {
			if(msg.topic === "deviceSchemaStartup"){
				msg.topic = "deviceSchema";
				if(node.allSchemas){
						msg.payload = deviceManager.getAllSchemas(true);
				}
				else {
					msg.payload = [deviceManager.getSimpleSchema(node.schema)];
				}
			}
			node.send(msg);
		});

		//cleanup
		this.on("close", function() {
			_.each(eventsTopics, function(topic){
				deviceManager.events.removeListener(topic, onDeviceEvent);
			});
		});

		//listen to device events
		_.each(eventsTopics, function(topic){
			deviceManager.events.on(topic, onDeviceEvent);
		});
	}

	RED.nodes.registerType("device listener", devicemonitor);

};

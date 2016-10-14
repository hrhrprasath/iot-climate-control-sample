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

  /*
  * stop virtual device
  */
  function deleteDevice(n) {

    RED.nodes.createNode(this, n);
    this.deviceId = n.deviceId;
    this.schema = RED.nodes.getNode(n.schema);
    var node = this;
    this.on("input", function(msg) {
      if(node.schema && msg.payload && msg.payload.deviceType && msg.payload.deviceType !== node.schema.deviceType){
        node.warn("Mismatching Device Type " +  msg.payload.deviceType + " , message not proceeded");
        node.send(null);
        return;
      }
      var deviceId = (msg.payload && msg.payload.deviceId) ? msg.payload.deviceId : (msg.deviceId) ? msg.deviceId : node.deviceId;
      if(!deviceId)
      throw new Error("Device Id is undefined");
      var device = (node.schema) ? deviceManager.getDevice(node.schema.deviceType, deviceId) : deviceManager.getDevicebyId(deviceId);
      if(!device){
        node.warn("Device " + deviceId + " does not exist.");
        node.send(null);
      }
      else{
        msg.payload = JSON.parse(JSON.stringify(device));//clone device
        deviceManager.removeDevice(device);
        node.warn("Device " + deviceId + " deleted.");
        node.send(msg);
      }


    });
  }
  RED.nodes.registerType("stop virtual device", deleteDevice);



};

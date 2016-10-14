module.exports = function(RED) {
    "use strict";
    var cfEnv = require("cfenv");
    var IBMIoTF = require('ibmiotf');

    var appClient;

    //support for multiple orgs
    var wiot_services  = cfEnv.getAppEnv().services['iotf-service'];

    var wiotp_creds = {};

    function connectBluemix() {
      if (wiot_services) {
        // TODO: remove this when we need to support multiple orgs
        var serviceCreds = wiot_services[0];

        wiotp_creds = {
          org: serviceCreds.credentials.org,
          id: Date.now().toString(),
          "auth-key": serviceCreds.credentials.apiKey,
          "auth-token": serviceCreds.credentials.apiToken
          };
        appClient = new IBMIoTF.IotfApplication(wiotp_creds);

      } else {
        console.log("Bluemix Service is not bound");
      }
    }

    function connectApiKey(creds) {
        wiotp_creds = {
          org: creds.user.split('-')[1],
          id: Date.now().toString(),
          "auth-key": creds.user,
          "auth-token": creds.password
          };
        appClient = new IBMIoTF.IotfApplication(wiotp_creds);
    }

    //initialize with Bluemix service
    connectBluemix();

    RED.httpAdmin.get('/devicetype/getbluemixtypes', function(req,res) {

        connectBluemix();
        res.send('success');
    });


    RED.httpAdmin.get('/devicetype/gettypes', function(req,res) {

      if(appClient) {
        appClient.getAllDeviceTypes().then (function onSuccess (response) {
              res.send(response);
          }, function onError (error) {
              res.status(403).send("No device types");
        });
      } else {
        res.status(401).send('Uninitialized Error');
      }
    });


    RED.httpAdmin.post('/devicetype/newapikey', function(req,res) {

      if(req.body.credentials) {
        connectApiKey(req.body.credentials);
      } else {
        var deviceNode = RED.nodes.getNode(req.body.id);
        connectApiKey(deviceNode.credentials);
      }

      res.status(201).send('success');
    });


    function DeviceTypeHandler(config) {
        RED.nodes.createNode(this,config);
        this.properties = config.properties || [];
        var authSelected = config.auth;

        if(authSelected === 'bluemix') {
          console.log("In bluemix");
          connectBluemix();
        } else if(authSelected === 'api'){
          console.log("in api mode");
          var deviceNode = RED.nodes.getNode(config.apiKey);

          connectApiKey(deviceNode.credentials);
        }
        var node = this;

        this.on('input', function(msg) {

          // Functions for success and failure for rest calls.
          var clearStatus = function(){
            setTimeout( function(){
              node.status({});
            },2000);
          }

          var onSuccess = function(argument) {
                  var msg = {
                    payload : argument
                  }
                  node.send(msg);
                  node.status({fill:"green",shape:"dot",text:"Sucess"});
                  clearStatus();
          };

          var onError =  function(argument) {
                  var msg = {
                    payload : argument
                  }
                  node.send(msg);

                  node.status({fill:"red",shape:"dot",text:"Error. Refer to debug tab"});
          };


          node.status({fill:"blue",shape:"dot",text:"Requesting"});

          //pass the operation name in msg
          var operation = msg.operation ? msg.operation : config.method;

          //rest all values from msg.payload
          //try to parse the payload if its string
          if( typeof msg.payload === 'string') {
            try {
              msg.payload = JSON.parse(msg.payload);
            } catch( exception) {
              // Do not stop the flow. user sent a non-json string
              // node.error("msg.payload must be a JSON or a JSON string");
              // clearStatus();
              // return;
            }
          }

          // take the values from config, if not get it from msg.
          var deviceType = config.deviceType ? config.deviceType : msg.payload.deviceType;
          var deviceTypeId = config.deviceTypeId ? config.deviceTypeId : msg.payload.deviceTypeId;

          var classId = config.classId ? config.classId : msg.payload.classId;

          var props ={}
          for (var i = 0; i < config.properties.length; i++) {
              props[config.properties[i].key] = config.properties[i].value
          }
          //console.log("props :" + JSON.stringify(props) );
          var deviceModel = props.model ? props.model : msg.payload.model;
          var serialNumber = props.serialNumber ? props.serialNumber : msg.payload.serialNumber;
          var deviceClass = props.deviceClass ? props.deviceClass : msg.payload.deviceClass;
          var manufacturer = props.manufacturer ? props.manufacturer : msg.payload.manufacturer;
          var infoDescription = props.infoDescription ? props.infoDescription : msg.payload.infoDescription;
          var firmwareVersion = props.firmwareVersion ? props.firmwareVersion : msg.payload.firmwareVersion;
          var hardwareVersion = props.hardwareVersion ? props.hardwareVersion : msg.payload.hardwareVersion;
          var descriptiveLocation = props.descriptiveLocation ? props.descriptiveLocation : msg.payload.descriptiveLocation;
          var metadata = props.metadata ? props.metadata : msg.payload.metadata;

          // get the values from msg.
          var authToken = msg.payload.authToken ? msg.payload.authToken : undefined;
          var desc = msg.payload.description ? msg.payload.description :  "";

          var deviceInfo = msg.payload.deviceInfo ? msg.payload.deviceInfo : {};
          var location = msg.payload.location ? msg.payload.location : {};
          var status = msg.payload.status ? msg.payload.status : {};

          if(( operation === 'Create') && !deviceTypeId ){
            node.error("DeviceTypeId must be set for "+operation+" operation. You can either set in the configuration or must be passed as msg.payload.deviceType");
            clearStatus();
            return;
          }

          if((operation !== 'GetAll' && operation !== 'Create') && !deviceType ){
            node.error("DeviceType must be set for "+operation+" operation. You can either set in the configuration or must be passed as msg.payload.deviceType");
            clearStatus();
            return;
          }

          deviceInfo = {
                    "serialNumber" : serialNumber,
                    "manufacturer" : manufacturer,
                    "model" : deviceModel,
                    "deviceClass" : deviceClass,
                    "description" : infoDescription,
                    "fwVersion" : firmwareVersion,
                    "hwVersion" : hardwareVersion,
                    "descriptiveLocation" : descriptiveLocation
                  };
          console.log("DeviceInfo = " + JSON.stringify(deviceInfo) );

          switch (operation) {
                case "GetAll":
                  appClient.getAllDeviceTypes().then(onSuccess,onError);
                  break;
                case "Create":
                  try {
                  		if(metadata !== undefined && metadata !== null && metadata !== '') {
	                        JSON.parse(metadata);
    	                    appClient.registerDeviceType(deviceTypeId, desc, deviceInfo, JSON.parse(metadata), classId).then(onSuccess,onError);
                  		} else {
	                        appClient.registerDeviceType(deviceTypeId, desc, deviceInfo, null, classId).then(onSuccess,onError);
	                    }

                  } catch (e) {
                        node.error("Passed metadata is not valid JSON");
                        clearStatus();
                        return;
                  }
                  break;
                case "Delete":
                  appClient.deleteDeviceType(deviceType).then(onSuccess,onError);
                  break;
                case "Get":
                  appClient.getDeviceType(deviceType).then(onSuccess,onError);
                  break;
                case "Update":
                  try {
                  		if(metadata !== undefined && metadata !== null && metadata !== '') {
	                        JSON.parse(metadata);
                        	appClient.updateDeviceType(deviceType, desc, deviceInfo, JSON.parse(metadata) ).then(onSuccess,onError);
                  		} else {
                        	appClient.updateDeviceType(deviceType, desc, deviceInfo, null ).then(onSuccess,onError);
	                    }
 
 				  } catch (e) {
                        node.error("Passed metadata is not valid JSON");
                        clearStatus();
                        return;
                  }
                  break;
          }
        });
    }
    RED.nodes.registerType("device-type-manager",DeviceTypeHandler);

    function WIoTPNode(n) {
      RED.nodes.createNode(this,n);
      this.name = n.name;

    }

    RED.nodes.registerType("wiotptype",WIoTPNode, {
      credentials: {
        user: {type:"text"},
        password: {type:"password"}
      }
    });
}

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

    RED.httpAdmin.get('/devicefactory/orgid', function(req,res) {
        res.send(JSON.stringify(wiotp_creds.org));
    });

    RED.httpAdmin.get('/devicefactory/getbluemixtypes', function(req,res) {

        connectBluemix();
        res.send('success');
    });

    RED.httpAdmin.get('/devicefactory/gettypes', function(req,res) {

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

    RED.httpAdmin.post('/devicefactory/newapikey', function(req,res) {

      if(req.body.credentials) {
        connectApiKey(req.body.credentials);
      } else {
        var deviceNode = RED.nodes.getNode(req.body.id);
        connectApiKey(deviceNode.credentials);
      }

      res.status(201).send('success');
    });

    function DeviceFactoryHandler(config) {
        RED.nodes.createNode(this,config);

        var authSelected = config.auth;

        if(authSelected === 'bluemix') {

          connectBluemix();

        } else if(authSelected === 'api'){
          
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
                  node.status({fill:"green",shape:"dot",text:"Success"});
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

          // check if he is trying for bulk operation.
          // If the payload is an array, use BULK operation.
          if(Array.isArray(msg.payload)) {

            switch (operation) {
                case "Create":
                  appClient.registerMultipleDevices(msg.payload).then(onSuccess,onError);
                  break;

                case "Delete":
                  appClient.deleteMultipleDevices(msg.payload).then(onSuccess,onError);
                  break;

                default : 
                  node.error("Unsupport Bulk operation " +operation+ ". Supported operations are Create and Delete");
                  clearStatus();
                }

            return;
          }

          // take the values from config, if not get it from msg.
          var deviceType = config.deviceType ? config.deviceType : msg.payload.deviceType;
          var deviceId = config.deviceId ? config.deviceId : msg.payload.deviceId;


          // get the values from msg.
          var authToken = msg.payload.authToken ? msg.payload.authToken : undefined;
          var desc = msg.payload.description ? msg.payload.description :  "";
          var metadata = msg.payload.metadata ? msg.payload.metadata : {};
          var deviceInfo = msg.payload.deviceInfo ? msg.payload.deviceInfo : {};
          var location = msg.payload.location ? msg.payload.location : {};
          var extensions = msg.payload.extensions ? msg.payload.extensions : {};
          var status = msg.payload.status ? msg.payload.status : {};

          
          if(!deviceType ){
            node.error("DeviceType must be set for "+operation+" operation. You can either set in the configuration or must be passed as msg.payload.deviceType");
            clearStatus();
            return;
          }

          if((operation !== 'GetAll' ) && !deviceId ){
            node.error("DeviceId must be set for "+operation+" operation. You can either set in the configuration or must be passed as msg.payload.deviceId");
            clearStatus();
            return;
          }

          switch (operation) {
                case "Create":
                  appClient.registerDevice(deviceType, deviceId, authToken, deviceInfo, location, metadata).then(onSuccess,onError);
                  break;
                case "Update":
                  appClient.updateDevice(deviceType, deviceId, deviceInfo, status, metadata, extensions).then(onSuccess,onError);
                  break;
                case "Delete":
                  appClient.unregisterDevice(deviceType, deviceId).then(onSuccess,onError);
                  break;
                case "Get":
                  appClient.getDevice(deviceType, deviceId).then(onSuccess,onError);
                  break;
                case "GetAll":
                  appClient.listAllDevicesOfType(deviceType).then(onSuccess,onError);
                  break;
                case "GetLoc":
                  appClient.getDeviceLocation(deviceType, deviceId).then(onSuccess,onError);
                  break;
                case "UpdateLoc":
                  if(!location) {
                    node.error("Location must be set. It can be set using msg.location");
                    return;
                  }
                  appClient.updateDeviceLocation(deviceType, deviceId, location).then(onSuccess,onError);
                  break;
                case "GetDm":
                  appClient.getDeviceManagementInformation(deviceType, deviceId).then(onSuccess,onError);
                  break;
                case "Get all gw":
                //appClient.listAllDevicesOfType(type).then(onSuccess,onError);
                  break;
          }

        });
    }
    RED.nodes.registerType("device-manager",DeviceFactoryHandler);

    function WIoTPNode(n) {
      RED.nodes.createNode(this,n);
      this.name = n.name;

    }

    RED.nodes.registerType("wiotp",WIoTPNode, {
      credentials: {
        user: {type:"text"},
        password: {type:"password"}
      }
    });
}

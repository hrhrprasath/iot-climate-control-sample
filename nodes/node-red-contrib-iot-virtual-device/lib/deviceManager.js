module.exports = exports = deviceManager = function(RED){
	cache = {};
	//var Proxy = require('harmony-proxy'); wait till it will be by default in node.js
	evEmiter = null;
	var _ = require("underscore");
	var chance = require("chance").Chance();

	deviceManager.addSchema = function(schema){
		ensureSchemaConfig(schema);
		var schemaEvt = deviceManager.getSimpleSchema(schema);
		schemaEvt.topic = "deviceSchema";
		evEmiter.emit('schemaAdded', schemaEvt);
	};

	deviceManager.removeSchema = function(schema){
		if(cache[schema.deviceType] && cache[schema.deviceType].schema)
			delete cache[schema.deviceType];
	};

	deviceManager.getSchema = function(deviceType){
		return (cache[deviceType]) ? cache[deviceType].schema : null;
	};

	deviceManager.getAllSchemas = function(simpleForm){
		var schemas = [];
		_.each(cache, function(schemaConfig){
			if(schemaConfig.schema)
				schemas.push( (simpleForm)? deviceManager.getSimpleSchema(schemaConfig.schema) : schemaConfig.schema);
		});
		return schemas;

	};

	deviceManager.getSimpleSchema = function(schema){
		var simSchema = {deviceType: schema.deviceType, properties: [], events: []};
		_.each(schema.props, function(prp){
			simSchema.properties.push(prp.name);
		});
		_.each(schema.evts, function(evt){
			simSchema.events.push(evt.name);
		});
		return simSchema;
	};

	deviceManager.getDevice = function(deviceType, deviceId){
		if(!deviceId || !cache[deviceType])
			return;
		return cache[deviceType].runningDevices[deviceId];
	};

		deviceManager.getDevicebyId = function(deviceId){
			for (var deviceType in cache) {
				var device = cache[deviceType].runningDevices[deviceId];
				if(device) return device;
			}
		};

	deviceManager.removeDevice = function(device){
		if(!device || !cache[device.deviceType])
			return;
		if(cache[device.deviceType].runningDevices[device.deviceId]){
			delete cache[device.deviceType].runningDevices[device.deviceId];
			//emit delete event
			var deviceClone = JSON.parse(JSON.stringify(device));//clone device
			deviceClone.topic = "deviceDeleted";
			evEmiter.emit('deviceDeleted', deviceClone);
			evEmiter.emit('deviceDeleted-'+ device.deviceType, deviceClone);
			evEmiter.emit('deviceDeleted-'+ device.deviceType + "-" + device.deviceId, deviceClone);
		}
	};


	deviceManager.createDevice = function(deviceId, schema, msg){
		ensureSchemaConfig(schema);
		var device = {
				deviceId: deviceId,
				deviceType: schema.deviceType,
				properties: {}
		};
		_.each(schema.props, function (schemaPrp){
			var value = null;
			if(msg && msg.payload && msg.payload.properties && msg.payload.properties[schemaPrp.name]){//value from payload
				value = msg.payload.properties[schemaPrp.name];
			}
			else{// default value
				if(schemaPrp.defaultValue){
					value = getTypedValue(schemaPrp.defaultValue.type, schemaPrp.defaultValue.value);
				}
				else if(schemaPrp.random){
					try {
						value = chance[schemaPrp.random.func].apply(chance, [schemaPrp.random.args]);
					} catch (e) {
						RED.log.error("Cannot set default value");
					}
				}
			}
			var sendPrpChangeEvent = function(oldValue , newValue){
				var propEvt = JSON.parse(JSON.stringify(device));//clone device
				propEvt.changedProperty = {name: schemaPrp.name, oldValue: oldValue, newValue: newValue};
				propEvt.topic = "propertyChange";
				evEmiter.emit('propertyChange', propEvt);
				evEmiter.emit('propertyChange-'+device.deviceType, propEvt);
				evEmiter.emit('propertyChange-'+device.deviceType + "-" + schemaPrp.name, propEvt);
				evEmiter.emit('propertyChange-'+device.deviceType + "-" + schemaPrp.name + "-" + device.deviceId, propEvt);
			};

			var prp = value;
			var touch = function(){
				sendPrpChangeEvent(prp, prp);
			};
			if(_.isObject(prp)){
				prp.touch = touch;
			}
			Object.defineProperty(device.properties, schemaPrp.name, {
				configurable: true,
				enumerable: true,
				get: function() { return prp; },
				set: function(val) {
					if(prp === val) return;

					if(prp.touch === touch && _.isObject(val)){
						val.touch = touch;
					}

					var oldValue = prp;
					prp = val;
					sendPrpChangeEvent(oldValue, val);
				}
			});
		});


		if(cache[schema.deviceType].runningDevices[device.deviceId]){
			throw "device "  + device.deviceId + " already exist";
		}
		cache[schema.deviceType].runningDevices[device.deviceId] = device;

		var createEvt = JSON.parse(JSON.stringify(device));//clone device
		createEvt.topic = "deviceCreated";
		evEmiter.emit('deviceCreated', createEvt);
		evEmiter.emit('deviceCreated-'+ device.deviceType, createEvt);
		evEmiter.emit('deviceCreated-'+ device.deviceType + "-" + device.deviceId, createEvt);

		return device;
	};


	function getTypedValue(type, value){
		var val = null;
		switch (type) {
		case "date":
			val = Date.now();
			break;
		case "num":
			val = Number(value);
			break;
		case "bool":
			val = /^true$/i.test(value);
			break;
		case "json":
			try {
				val = JSON.parse(value);
			} catch(e) {
				RED.log.error("invalid json");
			}
			break;
		default:
			val = value;
		}
		return val;
	}

	function ensureSchemaConfig(schema){
		if(cache[schema.deviceType] === undefined){
			cache[schema.deviceType] = {
					schema: schema,
					runningDevices: {}
			};
		}
		//config without active schema
		else if(cache[schema.deviceType].schema === undefined){
			cache[schema.deviceType].schema = schema;
		}
		else if(cache[schema.deviceType].schema.id !== schema.id){
			throw "More then one schema for device Type";
		}
	}




	function init(server,redSettings) {
		var events = require("events");
		var ev = new events.EventEmitter();
		evEmiter = new events.EventEmitter();

		RED.httpAdmin.get('/simulatedDevice/js/*', function(req, res){
			var options = {
					root: __dirname + '/../static/',
					dotfiles: 'deny'
			};

			res.sendFile(req.params[0], options);
		});
	}

	inited = false;
	if (!inited) {
		inited = true;
		init(RED.server, RED.settings);
	}

	deviceManager.events = evEmiter;

};

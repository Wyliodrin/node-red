
"use strict";

module.exports = function(RED) {
	var redis = null;
    var subscribe = null;
    var publish = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
        	if (RED.device)
        	{
        		redis = require ('redis');
        	}
        }
    }

    function sendMessage(config) {
        load ();
        RED.nodes.createNode(this,config);
        this.name = config.name;
        this.label = config.label;
        this.boardid = config.boardid;
        var that = this;
        this.on('input', function(msg) {
            if (!publish)
            {
                publish = redis.createClient ();
            }
            if (!this.boardid || this.boardid.trim().length == 0) this.boardid = msg.boardid;
            var ids = this.boardid.split (',');
            var label = that.label;
            if (!that.label || that.label.length==0) label = msg.label;
            for (var boardid in ids)
            {
                var m = null;
                if (config.message == true) 
                {
                    m = msg;
                    m._msg = true;
                }
                else m = msg.payload;
                // console.log ('sending: '+JSON.stringify ({id: ids[boardid].trim(), data:JSON.stringify(msg.payload)}));
                publish.publish ('communication_server:'+label, JSON.stringify ({id: ids[boardid].trim(), data:JSON.stringify(m)}));
            }
        });
    }
    RED.nodes.registerType("send",sendMessage);

    function receiveMessage(config) {
        load ();
        RED.nodes.createNode(this,config);
        var that = this;
        this.label = config.label;
        this.subscribe = redis.createClient ();
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }

        this.subscribe.psubscribe ('communication_client:'+this.label);
        this.subscribe.on ('pmessage', function (pattern, channel, strmessage)
        {
            var message = JSON.parse (strmessage);
            var msg = {};
            var pmessage = JSON.parse (message.data);
            if (pmessage._msg == true) msg = pmessage;
            else msg.payload = pmessage;
            msg.label = channel.substring ('communication_client'.length+1);
            msg.sender = message.from;
            that.send (msg);
        });
    }
    RED.nodes.registerType("receive",receiveMessage);

    function receiveSignal(config) {
        load ();
        RED.nodes.createNode(this,config);
        var that = this;
        this.signal = config.signal;
        this.subscribe = redis.createClient ();
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }

        this.subscribe.psubscribe ('communication_client:signal:'+this.signal);
        this.subscribe.on ('pmessage', function (pattern, channel, strmessage)
        {
            var message = JSON.parse (strmessage);
            var msg = 
            {
                signal: channel.substring ('communication_client:signal'.length+1),
                sender: message.from,
                payload: JSON.parse(message.data)
            };
            that.send (msg);
        });
    }
    RED.nodes.registerType("receivesignal",receiveSignal);

    function receiveSensors(config) {
        load ();
        RED.nodes.createNode(this,config);
        var that = this;
        this.mobile = config.mobile;
        this.subscribe = redis.createClient ();
        // if (this.interval == "on_input")
        // {
        //     this.inputs = 1;
        // }
        // else
        // {
        //     this.inputs = 0;
        // }

        this.subscribe.subscribe ('mobile:'+this.mobile);
        this.subscribe.on ('message', function (channel, strmessage)
        {
            console.log (strmessage);
            var message = JSON.parse (strmessage);
            var msg = 
            {
                sender: config.mobile,
                payload: JSON.parse(message.data)
            };
            that.send (msg);
        });
    }
    RED.nodes.registerType("mobile sensors",receiveSignal);
}


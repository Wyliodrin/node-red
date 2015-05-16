/**
 * Copyright 2013 IBM Corp.
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
    "use strict";

    var express = null;
    var app = null;
    var jinja = null;
    var http = null;
    var https = null;
    var mustache = null;
    var urllib = null;
    var querystring = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                express = require ('express');
                http = require("follow-redirects").http;
                https = require("follow-redirects").https;
                mustache = require("mustache");
                urllib = require("url");
                querystring = require("querystring");
            }
        }
    }

    function HTTPRequest(n) {
        load ();
        RED.nodes.createNode(this,n);
        var nodeUrl = n.url;
        var isTemplatedUrl = (nodeUrl||"").indexOf("{{") != -1;
        var nodeMethod = n.method || "GET";
        var node = this;
        var user = n.user;
        var password = n.password;
        this.on("input",function(msg) {
            node.status({fill:"blue",shape:"dot",text:"requesting"});
            var url;
            if (msg.url) {
                if (n.url && (n.url !== msg.url)) {
                    node.warn("Deprecated: msg properties should not override set node properties. See bit.ly/nr-override-msg-props");
                }
                url = msg.url;
            } else if (isTemplatedUrl) {
                url = mustache.render(nodeUrl,msg);
            } else {
                url = nodeUrl;
            }
            // url must start http:// or https:// so assume http:// if not set
            if (!((url.indexOf("http://")===0) || (url.indexOf("https://")===0))) {
                url = "http://"+url;
            }

            var method;
            if (msg.method) {
                if (n.method && (n.method !== msg.method)) {
                    node.warn("Deprecated: msg properties should not override set node properties. See bit.ly/nr-override-msg-props");
                }
                method = msg.method.toUpperCase();
            } else {
                method = nodeMethod.toUpperCase();
            }
            //node.log(method+" : "+url);
            var opts = urllib.parse(url);
            opts.method = method;
            opts.headers = {};
            if (msg.headers) {
                for (var v in msg.headers) {
                    if (msg.headers.hasOwnProperty(v)) {
                        var name = v.toLowerCase();
                        if (name !== "content-type" && name !== "content-length") {
                            // only normalise the known headers used later in this
                            // function. Otherwise leave them alone.
                            name = v;
                        }
                        opts.headers[name] = msg.headers[v];
                    }
                }
            }
            if (n.user && n.user.length>0) {
                opts.auth = n.user+":"+(n.password||"");
            }
            var payload = null;

            if (msg.payload && (method == "POST" || method == "PUT") ) {
                if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
                    payload = msg.payload;
                } else if (typeof msg.payload == "number") {
                    payload = msg.payload+"";
                } else {
                    if (opts.headers['content-type'] == 'application/x-www-form-urlencoded') {
                        payload = querystring.stringify(msg.payload);
                    } else {
                        payload = JSON.stringify(msg.payload);
                        if (opts.headers['content-type'] == null) {
                            opts.headers['content-type'] = "application/json";
                        }
                    }
                }
                if (opts.headers['content-length'] == null) {
                    opts.headers['content-length'] = Buffer.byteLength(payload);
                }
            }

            var req = ((/^https/.test(url))?https:http).request(opts,function(res) {
                res.setEncoding('utf8');
                msg.statusCode = res.statusCode;
                msg.headers = res.headers;
                msg.payload = "";
                res.on('data',function(chunk) {
                    msg.payload += chunk;
                });
                res.on('end',function() {
                    node.send(msg);
                    node.status({});
                });
            });
            req.on('error',function(err) {
                msg.payload = err.toString() + " : " + url;
                msg.statusCode = err.code;
                node.send(msg);
                node.status({fill:"red",shape:"ring",text:err.code});
            });
            if (payload) {
                req.write(payload);
            }
            req.end();
        });
    }

    RED.nodes.registerType("http request",HTTPRequest);

    function WebListenNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.port = n.port;
        this.route = n.route;
        this.method = n.method;
        var that = this;
        if (!app)
        {
            app = express ();
            app.use (require ('morgan')("dev"));
            var bodyparser=require ('body-parser');
            app.use (bodyparser.json());
            app.use (bodyparser.urlencoded({ extended:true }));
            app.use ('static', express.static(process.cwd()+'/static'));
            app.listen (5000);
        }
        
        if (this.method == 'GET')
        {
            app.get (this.route, function (req, res, next)
            {
                var msg = {
                    payload: req.query,
                    req: req,
                    res: res,
                    next: next
                };
                that.send (msg);
            });
        }
        else
        if (this.method == 'POST')
        {
            app.post (this.route, function (req, res, next)
            {
                var msg = {
                    payload: req.body,
                    req: req,
                    res: res,
                    next: next
                };
                that.send (msg);
            });
        }
        else
        if (this.method == 'PUT')
        {
            app.post (this.route, function (req, res, next)
            {
                var msg = {
                    payload: req.body,
                    req: req,
                    res: res,
                    next: next
                };
                that.send (msg);
            });
        }

    }

    RED.nodes.registerType("web route",WebListenNode);

    function WebResponseNode(n) {
        load ();
        RED.nodes.createNode(this,n);

        this.on ('input', function (msg)
        {
            var error = 200;
            if (msg.error) error = msg.error;
            if (msg.headers)
            {
                for (var h in msg.headers)
                {
                    msg.res.set (h, msg.headers[h]);
                }
            }
            msg.res.send (error, msg.payload);
        });

    }

    RED.nodes.registerType("web response",WebResponseNode);

    function WebResponseTemplateNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.template = n.template;
        if (!jinja)
        {
            jinja = require ('jinja');   
        }
        this.on ('input', function (msg)
        {
            var payload = null;
            if (msg.headers)
            {
                for (var h in msg.headers)
                {
                    msg.res.set (h, msg.headers[h]);
                }
            }
            if (typeof msg.payload == "object") payload = msg.payload;
            else payload = {payload: msg.payload};
            for (var variable in RED.settings.functionGlobalContext)
            {
                payload[variable] = RED.settings.functionGlobalContext[variable];
            }
            msg.res.send (jinja.compileFile (process.cwd()+'/templates/'+this.template).render (payload));
        });

    }

    RED.nodes.registerType("web template",WebResponseTemplateNode);
}

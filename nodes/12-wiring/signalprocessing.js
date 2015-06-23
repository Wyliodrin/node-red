/**
 * Copyright 2013, 2014 IBM Corp.
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

//Simple node to introduce a pause into a flow

module.exports = function(RED) {
    "use strict";

    var ndarray = null;
    var ndarray_fft = null;
    var window_functions = null;
    var _ = require ("underscore");

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
            if (RED.device)
            {
                ndarray = require ("ndarray");
                ndarray_fft = require ("ndarray-fft");
                window_functions = require ("scijs-window-functions");
            }
        }
    }

    function FFT(n) {
        load ();
        RED.nodes.createNode(this,n);

        this.window_function = n.window_function;
        this.inverse = n.inverse;
        
        var that = this;

        this.on("input", function(msg) {
            if (_.isArray (msg.payload))
            {
                var arrayr = null;
                var arrayi = null;

                if (msg.r && _.isArray (msg.r)) 
                {
                    arrayr = r;
                }
                else if (_.isArray(msg.payload[0]))
                {
                    arrayr = msg.payload[0];    
                }
                else
                {
                    arrayr = msg.payload;
                }
                if (msg.i && _.isArray (msg.i)) 
                {
                    arrayr = i;
                }
                else if (_.isArray(msg.payload[1]))
                {
                    arrayi = msg.payload[1];
                }

                if (!this.inverse)
                {
                    var win_function = window_functions[this.window_function];
                    if (!win_function) win_function = window_functions.rectangular;
                    if (arrayr)
                    {
                        for (var i = 0; i < array.length; i++) 
                        {
                            arrayr[i] = win_function (i, arrayr.length);
                        }
                    }
                    if (arrayi)
                    {
                        for (var i = 0; i < array.length; i++) 
                        {
                            arrayi[i] = win_function (i, arrayi.length);
                        }
                    }
                }
                else
                {
                    
                }

                if (arrayr && !arrayi) arrayi = new Array (arrayr);

                if (_.isArray(arrayr) && _.isArray(arrayi))
                {
                    var array_r = ndarray (arrayr);
                    var array_i = ndarray (arrayi);
                    ndarray_fft ((!that.inverse?1:-1), array_r, array_i);
                    n.send ({payload: [array_r.data, array_i.data], r: array_r.data, i: array_i.data});
                }
                else
                {
                    this.error ('Payload, r and i should be arrays');
                }
            }
            else
            {
                this.error ("Payload should be an array");
            }
        });

        this.on("close", function() {
            
        });
    }
    RED.nodes.registerType("fourier",FFT);

}

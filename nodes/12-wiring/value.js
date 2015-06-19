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
    var util = null;
    var vm = null;

    var _load = false;

    function load ()
    {
        if (!_load)
        {
            _load = true;
        }
    }

    function ValueNode(n) {
        load ();
        RED.nodes.createNode(this,n);
        this.name = n.name;
        this.value = n.value;
        this.global = RED.settings.functionGlobalContext || {};

        var node = this;
        
        try {
            this.on("input", function(msg) {
                node.global[node.value] = msg.payload;
            });
        } catch(err) {
            this.error(err);
        }
    }

    RED.nodes.registerType("value",ValueNode);
}

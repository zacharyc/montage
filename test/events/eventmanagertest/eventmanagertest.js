/* <copyright>
 This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
 No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
 (c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
 </copyright> */
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component;

var EventManagerTest = exports.EventManagerTest = Montage.create(Montage, {
    deserializedFromTemplate: {
        value: function() {
            var dummyComponent = Montage.create(Component);
            dummyComponent.hasTemplate = false;
            dummyComponent.element = document.body;
            dummyComponent.needsDraw = true;
        }
    },

    activationTarget: {
        value: null
    }
});

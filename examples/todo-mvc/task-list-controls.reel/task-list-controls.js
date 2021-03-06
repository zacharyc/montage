/* <copyright>
 This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
 No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
 (c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
 </copyright> */
var Montage = require("montage").Montage;var Component = require("montage/ui/component").Component;

exports.TaskListControls = Montage.create(Component, {
    hasTemplate: {value: true},

    prepareForDraw: {
        value: function() {

            if (this.clearCompletedForm) {
                this.clearCompletedForm.addEventListener("submit", this, false);
            }

        }
    },

    tasksController: {
        enumerable: false,
        value: null
    },

    clearCompletedForm: {
        enumerable: false,
        value: null
    },

    handleSubmit: {
        enumerable: false,
        value: function(event) {
            event.preventDefault();


            var completedTasks = this.tasksController.organizedObjects.filter(function(value) {
                return value.completed;
            });

            this.tasksController.removeObjects.apply(this.tasksController, completedTasks);
        }
    }

});

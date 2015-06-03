/*
# CL2.0 SVM class
*/

"use strict";

// Dependency:
var ref = require("ref");
var clUtils = require("./clUtils");

// Constructor
function clSVM(context, flags, size, alignment) {
	var cl = context.cl;
	var err = ref.alloc(cl.types.ErrorCode);
	this.handle = cl.imports.clSVMAlloc(clUtils.toHandle(context), flags, size, alignment);
	this.context = context;
	cl.checkError(err);
}

module.exports = clSVM;

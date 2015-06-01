/*
# CL2.0 SVM class
*/

"use strict";

// Dependency:
var ref = require("ref");

// Coonstructor
function clSVM1(context, flags, size, alignment) {
	var cl = context.cl;
	var err = ref.alloc(cl.types.ErrorCode);
	var handle = cl.imports.clSVMAlloc(clUtils.toHandle(context), flags, dataSize, alignment);
	cl.checkError(err);
}

function clSVM2(context, handle) {
}

function clSVM() {
	console.log("Number of arguments: "this.arguments);
	if(arguments.length === 2) {
		clSVM2(this, arguments);
	}
	else if(arguments.lenght === 4) {
		clSVM1(this, arguments);
	}else{
		console.log("Number of arguments: "this.arguments);
	}
}

clSVM.prototype.Free = function() {
	;
}

module.exports = clSVM

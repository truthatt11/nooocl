"use strict";

var clUtils = require("./clUtils");
var ref = require("ref");
var _ = require("lodash");

var kernelArgKind = {
    clObject: 0,
    localSize: 1,
    value: 2
};

function KernelArgSVM(kernel, index, value) {
    this.kernel = kernel;
    this.index = index;
    this.kind = 0;
    this._value = value;
    this._type = null;
    this._valueBuffer = null;
    this._set = null;
    var setArg = this.kernel.cl.imports.clSetKernelArgSVMPointer;

    if (this._value === null || clUtils.isHandle(this._value)) {
        this.kind = kernelArgKind.clObject;
        if (this._value !== null) {
            this._value = clUtils.toHandle(this._value);
            this._valueBuffer = this._value;
        }
        else {
            this._valueBuffer = null;
        }
        this._set = function () {
            this.kernel.cl.checkError(setArg(this.kernel.handle, this.index, this._valueBuffer));
        }.bind(this);
    }
    else {
        this.kind = kernelArgKind._value;
        this._type = ref.coerceType(type);
        this._valueBuffer = ref.alloc(this._type);
        ref.set(this._valueBuffer, 0, this._value);
        this._set = function () {
            this.kernel.cl.checkError(setArg(this.kernel.handle, this.index, this._valueBuffer));
        }.bind(this);
    }

    this._set();
}

KernelArgSVM.kind = kernelArgKind;

Object.defineProperties(KernelArgSVM.prototype, {
    value: {
        get: function () {
            return this._value;
        },
        set: function (to) {
            if (this.kind === kernelArgKind.clObject) {
                if (to === null) {
                    if (this._value === null) {
                        return;
                    }
                    this._value = null;
                    this._set();
                }
                else {
                    to = clUtils.toHandle(to, "to");
                    if (this.value === null || ref.address(this._value) !== ref.address(to)) {
                        this._value = clUtils.toHandle(this._value);
                        ref.set(this._valueBuffer, 0, this._value);
                        this._set();
                    }
                }
            }
            else if (this.kind === kernelArgKind.localSize) {
                if (this._value !== to) {
                    this._value = to;
                    this._set();
                }
            }
            else { // kernelArgKind.value
                if (this._valueBuffer.deref() !== to) {
                    this._value = to;
                    ref.set(this._valueBuffer, 0, this._value);
                    this._set();
                }
            }
        }
    }
});

module.exports = KernelArgSVM;

"use strict";

// Dependency:
var fs = require("fs");
var path = require("path");
var cwd = __dirname;
var nooocl = require("../");
var CLHost = nooocl.CLHost;
var CLContext = nooocl.CLContext;
var CLSVM = nooocl.clSVM;
var CLCommandQueue = nooocl.CLCommandQueue;
var NDRange = nooocl.NDRange;
var CLError = nooocl.CLError;
var ref = require("ref");
var double = ref.types.double;

// Initialize OpenCL then we get host, device, context, and a queue
var host = CLHost.createV20();
var defs = host.cl.defs;

var platforms = host.getPlatforms();
var device;
function searchForDevice(hardware) {
    platforms.forEach(function (p) {
        var devices = hardware === "gpu" ? p.gpuDevices() : p.cpuDevices();
        devices = devices.filter(function (d) {
            // Is double precision supported?
            // See: https://www.khronos.org/registry/cl/sdk/1.1/docs/man/xhtml/clGetDeviceInfo.html
            return d.doubleFpConfig &
                (defs.CL_FP_FMA | defs.CL_FP_ROUND_TO_NEAREST | defs.CL_FP_ROUND_TO_ZERO | defs.CL_FP_ROUND_TO_INF | defs.CL_FP_INF_NAN | defs.CL_FP_DENORM);
        });
        if (devices.length) {
            device = devices[0];
        }
        if (device) {
            return false;
        }
    });
}

searchForDevice("gpu");
if (!device) {
    console.warn("No GPU device has been found, searching for a CPU fallback.");
    searchForDevice("cpu");
}

if (!device) {
    throw new Error("No capable OpenCL 2.0 device has been found.");
}
else {
    console.log("Running on device: " + device.name + " - " + device.platform.name);
}

var context = new CLContext(device);
var queue = new CLCommandQueue(context, device);

// Initialize data on the host side:
var n = 1000;
var bytes = n * double.size;

console.log(nooocl.clSVM == null);
console.log(CLSVM == null);

var h_a = new CLSVM(context, defs.CL_MEM_READ_WRITE, bytes, 0);
var h_b = new CLSVM(context, defs.CL_MEM_READ_WRITE, bytes, 0);
var h_c = new CLSVM(context, defs.CL_MEM_WRITE_ONLY, bytes, 0);

//console.log(queue.cl.libName);
queue.enqueueSVMMap(false, defs.CL_MAP_WRITE | defs.CL_MAP_READ, h_a.handle, bytes, null);
queue.enqueueSVMMap(false, defs.CL_MAP_WRITE, h_b.handle, bytes, null);

var ha = ref.reinterpret(h_a.handle, bytes, 0);
var hb = ref.reinterpret(h_b.handle, bytes, 0);
var hc = ref.reinterpret(h_c.handle, bytes, 0);

// Initialize vectors on host
for (var i = 0; i < n; i++) {
    ref.types.double.set(ha, i*ref.types.double.size, Math.sin(i) * Math.sin(i));
    ref.types.double.set(hb, i*ref.types.double.size, Math.cos(i) * Math.cos(i));
}
/*
for (var i=0; i<n; i++) {
    console.log("a="+ref.types.double.get(ha, i*ref.types.double.size)+", i="+i);
    console.log("b="+ref.types.double.get(hb, i*ref.types.double.size)+", i="+i);
}
*/
queue.enqueueSVMUnmap(h_a, null);
queue.enqueueSVMUnmap(h_b, null);

// It's time to build the program.
var kernelSourceCode = fs.readFileSync(path.join(cwd, "vecAdd.cl"), { encoding: "utf8" });
var program = context.createProgram(kernelSourceCode);

console.log("Building ...");
// Building is always asynchronous in NOOOCL!
program.build("-cl-fast-relaxed-math -cl-std=CL2.0").then(
    function () {
        var buildStatus = program.getBuildStatus(device);
        var buildLog = program.getBuildLog(device);
        console.log(buildLog);
        if (buildStatus < 0) {
            throw new CLError(buildStatus, "Build failed.");
        }
        console.log("Build completed.");

        // Kernel stuff:
        var kernel = program.createKernel("vecAdd");

        kernel.setArgSVM(0, h_a);
        kernel.setArgSVM(1, h_b);
        kernel.setArgSVM(2, h_c);
        // Notice: in NOOOCL you have specify type of value arguments,
        // because there is no C compatible type system exists in JavaScript.
        kernel.setArg(3, n, "uint");

        // Ranges:
        // Number of work items in each local work group
        var localSize = new NDRange(64);
        // Number of total work items - localSize must be devisor
        var globalSize = new NDRange(Math.ceil(n / 64) * 64);

        console.log("Launching the kernel.");

        // Enqueue the kernel asynchronously
        queue.enqueueNDRangeKernel(kernel, globalSize, localSize);

        // Then copy back the result from the device to the host asynchronously,
        // when the queue ends.
        // We should query a waitable queue which returns an event for each enqueue operations,
        // and the event's promise can be used for continuation of the control flow on the host side.
        console.log("Waiting for result.");
        queue.waitable().enqueueSVMMap(true, defs.CL_MAP_READ ,h_c, bytes, null).promise
            .then(function() {
                queue.enqueueSVMMap(true, defs.CL_MAP_READ, h_a, bytes, null);
                queue.enqueueSVMMap(true, defs.CL_MAP_READ, h_b, bytes, null);
                // Data gets back to host, we're done:

                var sum = 0;
                hc = ref.reinterpret(h_c.handle, bytes, 0);
                ha = ref.reinterpret(h_a.handle, bytes, 0);
                hb = ref.reinterpret(h_b.handle, bytes, 0);
                for (var i = 0; i < n; i++) {
                    sum += ref.types.double.get(hc, i*ref.types.double.size);
                
                    console.log("i="+i);
                    console.log("a=" + ref.types.double.get(ha, i*ref.types.double.size));
                    console.log("b=" + ref.types.double.get(hb, i*ref.types.double.size));
                    console.log("c=" + ref.types.double.get(hc, i*ref.types.double.size));
                
                }

                console.log("Final result: " + sum / n);
            });
        queue.enqueueSVMUnmap(h_a, null);
        queue.enqueueSVMUnmap(h_b, null);
        queue.enqueueSVMUnmap(h_c, null);
    });

console.log("(Everything after this point is asynchronous.)");

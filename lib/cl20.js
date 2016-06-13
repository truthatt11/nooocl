"use strict";

var util = require("util");
var CL12 = require("./cl12");
var _ = require("lodash");
var ref = require("ref");
//var ffi = require("ffi-io");
var ffi = require("ffi");

function CL20() {
    CL12.call(this);
    var types = this.types;
    this.version = 2.0;
    _.extend(
        this.imports,
        new ffi.Library(this.libName,
            {
                //   extern CL_API_ENTRY cl_int CL_API_CALL/
                //clCreateSubDevices(cl_device_id                         /* in_device */,
                //                   const cl_device_partition_property * /* properties */,
                //                   cl_uint                              /* num_devices */,
                //                 cl_device_id *                       /* out_devices */,
                //                   cl_uint *                            /* num_devices_ret */) CL_API_SUFFIX__VERSION_1_2;
                // clCreateSubDevices: ["int", ["pointer", types.DevicePartitionProperties, "uint", ref.refType(types.DeviceId), types.ErrorCodeRet]],

                //extern CL_API_ENTRY cl_int CL_API_CALL
                //clSVMAlloc(cl_context            /* context */,
			 	//      cl_svm_mem_flags                   /* flags */,
				//	size_t			/* size */,
				//  	unsigned int 		/* alignment */) CL_API_SUFFIX__VERSION_2_0;
                clSVMAlloc: ["pointer", [types.Context, types.MemFlags, "size_t", "uint"]],


                //extern CL_API_ENTRY void CL_API_CALL
                //clSVMFree(cl_context	/* context */, 
				//	void*	/* svm_pointer */) CL_API_SUFFIX__VERSION_2_0;
                clSVMFree: ["void", [types.Context, "pointer"]],

                //extern CL_API_ENTRY cl_int CL_API_CALL
                //clEnqueueSVMFree(cl_command_queue              /* command_queue */,
                //              cl_uint             /* num_svm_pointers */,
                //              void *              /* svm_pointers */,
                //              void (CL_CALLBACK * pfn_free_func) (cl_command_queue, cl_uint, void*, void*),
                //              void *              /* user_data */,
				//              cl_uint             /* num_events_in_wait_list */,
                //              const cl_event *    /* event_wait_list */),
				//              cl_event *          /* event */, CL_API_SUFFIX__VERSION_2_0;
                clEnqueueSVMFree: ["int", [types.CommandQueue, "uint", "pointer", "pointer", "pointer", "uint", types.EventArray, types.Event]],

                //extern CL_API_ENTRY cl_int CL_API_CALL
                //clEnqueueSVMMemcpy(cl_command_queue           /* command_queue */,
                //                 cl_bool              /* blocking_copy */,
                //                 void *               /* dst_ptr */,
                //                 const void *         /* src_ptr */,
                //                 size_ t              /* size */,
                //                 cl_uint              /* num_events_in_wait_list */,
                //                 const cl_event *     /* event_wait_list */,
                //                 cl_event *           /* event */, ) CL_API_SUFFIX__VERSION_2_0;
                clEnqueueSVMMemcpy: ["int", [types.CommandQueue, types.Bool, "pointer", "pointer", "size_t", "uint", "pointer", "pointer"]],

                //extern CL_API_ENTRY cl_int CL_API_CALL/
                //clEnqueueSVMMemFill(cl_command_queue           /* command_queue */,
                //              void *               /* svm_ptr */,
                //              const void *         /* pattern */,
                //              size_t               /* pattern_size */,
                //              size_t               /* size */,
                //              cl_uint              /* num_events_in_wait_list */,
                //              const cl_event *     /* events_wait_list */,
                //              cl_event *           /* event */ ) CL_API_SUFFIX__VERSION_2_0;
                clEnqueueSVMMemFill: ["int", [types.CommandQueue, "pointer", "pointer", "size_t", "size_t", "uint", types.EventArray, types.EventRef]],

                //extern CL_API_ENTRY cl_int CL_API_CALL
                //clEnqueueSVMMap(cl_command_queue /* command_queue */,
                //              cl_bool            /* blocking_map */,
                //              cl_map_flags       /* map_flags */,
                //              void *             /* svm_ptr */,
                //              size_t             /* size */,
                //              cl_uint            /* num_events_in_wait_list */,
                //              const cl_event *   /* event_wait_list */,
                //              cl_event *         /* event */ ) CL_API_SUFFIX__VERSION_2_0;
                clEnqueueSVMMap: ["int", [types.CommandQueue, types.Bool, types.MapFlags, "pointer", "size_t", "uint", types.EventArray, types.EventRef]],

                //extern CL_API_ENTRY cl_int CL_API_CALL
                //clEnqueueSVMUnmap(cl_command_queue   /* command_queue */,
                //                    void *             /* svm_ptr */,
                //                    cl_uint            /* num_events_in_wait_list */,
                //                    const cl_event *   /* event_wait_list */,
                //                    cl_event *         /* event */) CL_API_SUFFIX__VERSION_2_0;
                clEnqueueSVMUnmap: ["int", [types.CommandQueue, "pointer", "uint", types.EventArray, types.EventRef]],

                //extern CL_API_ENTRY cl_int CL_API_CALL
                //clSetKernelArgSVMPointer(cl_kernel     /* kernel */,
                //                    cl_uint            /* arg_index */,
                //                    const void *       /* arg_value */) CL_API_SUFFIX__VERSION_2_0;
                clSetKernelArgSVMPointer: ["int", [types.Kernel, "uint", "pointer"]]
            }));
}

util.inherits(CL20, CL12);

module.exports = CL20;

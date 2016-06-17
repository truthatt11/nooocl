#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <math.h>

#ifdef __APPLE__
#include <OpenCL/opencl.h>
#else
#include <CL/cl.h>
#endif

#define MAX_SOURCE_SIZE (0x100000)

int main(void) {
    // Create the two input vectors
    int i, j;
    const int LIST_SIZE = 1024;
    double *A, *B, *C;

    // Load the kernel source code into the array source_str
    FILE *fp;
    char *source_str;
    size_t source_size;

    clock_t gpu_start = clock();
    fp = fopen("vecAdd.cl", "r");
    if (!fp) {
        fprintf(stderr, "Failed to load kernel.\n");
        exit(1);
    }
    source_str = (char*)malloc(MAX_SOURCE_SIZE);
    source_size = fread( source_str, 1, MAX_SOURCE_SIZE, fp);
    fclose( fp );
    
//    printf("%s", source_str);;
    
    // Get platform and device information
    cl_platform_id platform_id = NULL;
    cl_device_id device_id[2];
    cl_uint ret_num_devices;
    cl_uint ret_num_platforms;
    char msg[2][256];
    cl_int ret = clGetPlatformIDs(1, &platform_id, &ret_num_platforms);
    
    cl_int ret_platform_info = clGetPlatformInfo(platform_id, CL_PLATFORM_VERSION, 256, &msg, NULL);
    if(ret_platform_info == CL_SUCCESS) {
        printf("Number of Platforms is: %d\n", ret_num_platforms);
        printf("Platform info = \"%s\"\n", msg);
    }

    size_t wis[3], wis2[3];
    ret = clGetDeviceIDs( platform_id, CL_DEVICE_TYPE_ALL, 2, (cl_device_id*)&device_id, &ret_num_devices);
	printf("Number of Devices: %d\n", ret_num_devices);
    cl_int ret_device_info = clGetDeviceInfo(device_id[0], CL_DEVICE_VERSION, sizeof(msg[0]), &msg[0], NULL);
    ret_device_info = clGetDeviceInfo(device_id[1], CL_DEVICE_VERSION, sizeof(msg[1]), &msg[1], NULL);
    ret_device_info = clGetDeviceInfo(device_id[0], CL_DEVICE_MAX_WORK_ITEM_SIZES, sizeof(size_t)*3, &wis, NULL);
    ret_device_info = clGetDeviceInfo(device_id[1], CL_DEVICE_MAX_WORK_ITEM_SIZES, sizeof(size_t)*3, &wis2, NULL);
	printf("Device Version = \"%s\"\n\"%s\"\n", msg[0], msg[1]);
	printf("%s max work item size: %zu %zu %zu\n", msg[0], wis[0], wis[1], wis[2]);
	printf("%s max work item size: %zu %zu %zu\n", msg[1], wis2[0], wis2[1], wis2[2]);

    // Create an OpenCL context
    cl_context context = clCreateContext( NULL, 1, &device_id[0], NULL, NULL, &ret);

    // Create a command queue
    cl_command_queue command_queue = clCreateCommandQueueWithProperties(context, device_id[0], 0, &ret);

    // Create memory buffers on the device for each vector 
    // Copy the lists A and B to their respective memory buffers
    A = (double*)clSVMAlloc(context, CL_MEM_READ_ONLY, LIST_SIZE*sizeof(double), 0);
    B = (double*)clSVMAlloc(context, CL_MEM_READ_ONLY, LIST_SIZE*sizeof(double), 0);
    C = (double*)clSVMAlloc(context, CL_MEM_READ_WRITE, LIST_SIZE*sizeof(double), 0);
    if(A == NULL) printf("SVM alloc failed.\n");

    ret = clEnqueueSVMMap(command_queue, CL_TRUE, CL_MAP_WRITE, A, LIST_SIZE*sizeof(double), 0, NULL, NULL);
    ret = clEnqueueSVMMap(command_queue, CL_TRUE, CL_MAP_WRITE, B, LIST_SIZE*sizeof(double), 0, NULL, NULL);
    ret = clEnqueueSVMMap(command_queue, CL_TRUE, CL_MAP_WRITE, C, LIST_SIZE*sizeof(double), 0, NULL, NULL);
    for(i = 0; i < LIST_SIZE; i++) {
        A[i] = sin(i)*sin(i);
        B[i] = cos(i)*cos(i);
        C[i] = 0.0;
    }
    ret = clEnqueueSVMUnmap(command_queue, A, 0, NULL, NULL);
    ret = clEnqueueSVMUnmap(command_queue, B, 0, NULL, NULL);
    ret = clEnqueueSVMUnmap(command_queue, C, 0, NULL, NULL);
    
    // Create a program from the kernel source
    cl_program program = clCreateProgramWithSource(context, 1, (const char **)&source_str, (const size_t *)&source_size, &ret);

    // Build the program
    ret = clBuildProgram(program, 1, &device_id[0], "-I ./ -Werror -cl-std=CL2.0", NULL, NULL);

    // Create the OpenCL kernel
    cl_kernel kernel = clCreateKernel(program, "vecAdd", &ret);
    size_t global_item_size[1] = {1024}; // Process the entire lists
    size_t local_item_size[1] = {16}; // Process in groups of 64

    // Set the arguments of the kernel
    ret = clSetKernelArgSVMPointer(kernel, 0, (void *)A);
    ret = clSetKernelArgSVMPointer(kernel, 1, (void *)B);
    ret = clSetKernelArgSVMPointer(kernel, 2, (void *)C);
    ret = clSetKernelArg(kernel, 3, sizeof(int), (void *)&LIST_SIZE);

    // Execute the OpenCL kernel on the list
    ret = clEnqueueNDRangeKernel(command_queue, kernel, 1, NULL, (const size_t*)&global_item_size, (const size_t*)&local_item_size, 0, NULL, NULL);
    clock_t gpu_time = clock() - gpu_start;
    printf("GPU execution time = %lf\n", ((double)gpu_time)/CLOCKS_PER_SEC);
    // Read the memory buffer C on the device to the local variable C
    
    // Display the result to the screen
    ret = clEnqueueSVMMap(command_queue, CL_TRUE, CL_MAP_READ, C, LIST_SIZE*sizeof(double), 0, NULL, NULL);
    printf("C[] = A[]+B[] = (GPU)\n");
    for(i = 0; i < 1024; i++) {
        printf("A[%d] = %f, B[%d] = %f, C[%d] = %f\n", i, A[i], i, B[i], i, C[i]);
    }
    ret = clEnqueueSVMUnmap(command_queue, C, 0, NULL, NULL);

    printf("A@%p, B@%p, C@%p\n", A, B, C);
    printf("A+1@%p, B+1@%p, C+1@%p\n", &A[1], &B[1], &C[1]);
    printf("A+2@%p, B+2@%p, C+2@%p\n", &A[2], &B[2], &C[2]);
    printf("A+1023@%p, B+1023@%p, C+1023@%p\n", &A[1023], &B[1023], &C[1023]);



    // Clean up
    ret = clFlush(command_queue);
    ret = clFinish(command_queue);
    ret = clReleaseKernel(kernel);
    ret = clReleaseProgram(program);
//    ret = clReleaseMemObject(a_mem_obj);
//    ret = clReleaseMemObject(b_mem_obj);
//    ret = clReleaseMemObject(c_mem_obj);
    ret = clReleaseCommandQueue(command_queue);
    clSVMFree(context, A);
    clSVMFree(context, B);
    clSVMFree(context, C);
    ret = clReleaseContext(context);
//    free(CC);
    return 0;
}

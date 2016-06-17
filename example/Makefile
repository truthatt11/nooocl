OS := $(shell uname)

ifeq ($(OS),Darwin)
	OPTIONS += -framework OpenCL
else
	OPTIONS += -l OpenCL
endif

main: vecAddSVM.c
	g++ -Wall -g vecAddSVM.c -o main $(OPTIONS)

clean:
	rm -rf main

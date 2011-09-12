#
# Test Makefile for gpgme test application
# Nico Schottelius, 2007-08-05, GPLv3
#

# flags=$(shell gpgme-config --libs --cflags)
flags=$($(HOME)/repos/lockbox/bin/gpgme-config --libs --cflags)

gpgme: gpgme.cc
	@echo $(flags)
	g++ -Wl,-rpath -Wl,/home/tierney/repos/lockbox/lib -Wall -D_FILE_OFFSET_BITS=64 -g -L/home/tierney/repos/lockbox/lib -lgpgme -L/home/tierney/repos/lockbox/lib -lassuan -L/usr/lib/x86_64-linux-gnu -lgpg-error -L/usr/lib/x86_64-linux-gnu -lgpg-error -I/home/tierney/repos/lockbox/include -I/home/tierney/repos/lockbox/include -lgpgme -lgpg-error gpgme.cc -o $@

gpgme1: gpgme1.c
   gcc -D_FILE_OFFSET_BITS=64 -g ${flags} gpgme1.c -o $@

gpgme2: gpgme2.c
   gcc -D_FILE_OFFSET_BITS=64 -g ${flags} $< -o $@

clean:
	rm -f gpgme

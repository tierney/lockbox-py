#!/usr/bin/env python
# -*- Mode:Python; indent-tabs-mode:nil; tab-width:4 -*-
#
# Copyright 2011 Matt Tierney <tierney@cs.nyu.edu>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

# rsync-related components have the following copyright and license.
# 
# Copyright 2002 Ben Escoto <ben@emerose.org>
# Copyright 2007 Kenneth Loafman <kenneth@loafman.com>
#
# This file is part of duplicity.
#
# Duplicity is free software; you can redistribute it and/or modify it
# under the terms of the GNU General Public License as published by the
# Free Software Foundation; either version 2 of the License, or (at your
# option) any later version.
#
# Duplicity is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with duplicity; if not, write to the Free Software Foundation,
# Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307 USA

import os
import sys
# from distribute_setup import use_setuptools
from setuptools import setup, find_packages, Command, Extension

# use_setuptools()

incdir_list = None
libdir_list = None

if os.name == 'posix':
    LIBRSYNC_DIR = os.environ.get('LIBRSYNC_DIR', '')
    args = sys.argv[:]
    for arg in args:
        if arg.startswith('--librsync-dir='):
            LIBRSYNC_DIR = arg.split('=')[1]
            sys.argv.remove(arg)
    if LIBRSYNC_DIR:
        incdir_list = [os.path.join(LIBRSYNC_DIR, 'include')]
        libdir_list = [os.path.join(LIBRSYNC_DIR, 'lib')]

setup(
    name = "Lockbox",
    version = "0.1",
    packages = ['lockbox'],
    package_dir = { 'lockbox' : 'src/lockbox' },
    setup_requires = ['nose'],
    test_suite = 'nose.collector',
    ext_modules = [Extension("lockbox._librsync",
                             ["_librsyncmodule.c"],
                             include_dirs=incdir_list,
                             library_dirs=libdir_list,
                             libraries=["rsync"])],

)

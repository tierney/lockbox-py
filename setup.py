#!/usr/bin/env python

from distribute_setup import use_setuptools
use_setuptools()

from setuptools import setup, find_packages, Command
setup(
    name = "Lockbox",
    version = "0.1",
    package_dir = { '' : 'src' },
    packages = ['lockbox'],
    setup_requires = ['nose'],
    test_suite = 'nose.collector',
)

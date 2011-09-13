import logging

class LoggingHelper():
    def __init__(self):
        FORMAT = "%(asctime)-15s %(levelname)-10s %(module)-10s %(lineno)-3d ThreadID:%(thread)-2d %(message)s"
        logging.basicConfig(filename="test.log", format=FORMAT)
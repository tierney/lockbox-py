from pyme import core, constants

def Callback(x, y, z):
    """ Callback to give password """
    print "I'm in the callback!"
    return "abcdabcdfs\n"

plaintext = "Hello World!"
crypttext = ""
#First set of data
plaindata1 = core.Data(plaintext)
cryptdata1 = core.Data()

cont = core.Context()
cont.set_armor(True) #ASCII

cont.op_keylist_start("Joe Tester", 1) #use first key
cont.op_encrypt([cont.op_keylist_next()], 1, plaindata1, cryptdata1)
cryptdata1.seek(0,0)
crypttext = cryptdata1.read()
print "Encrypted Data:\n %s" % crypttext

cryptdata2 = core.Data(crypttext)
plaindata2 = core.Data()
cont.set_passphrase_cb(Callback)
cont.op_decrypt(cryptdata2, plaindata2) #freeze here!!!!
plaindata2.seek(0,0)
print "Decrypted Data:\n %s" % plaindata2.read()


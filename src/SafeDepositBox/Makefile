all:
	rm ~/.safedepositbox/safedepositbox.db
	sqlite3 ~/.safedepositbox/safedepositbox.db < ~/Dropbox/sdb.sql
	./SafeDepositBox.py

#all: clean build

test:
	python setup.py py2app -A
	./dist/SafeDepositBox.app/Contents/MacOS/SafeDepositBox

build:
	python setup.py py2app
	cp -r dist/SafeDepositBox.app ~/Desktop

alias:
	python setup.py py2app -A

open:
	open dist/SafeDepositBox.app

clean:
	rm -rf *dec *enc *pem *~ *.aes256 *.pyc build dist ~/Desktop/SafeDepositBox.app

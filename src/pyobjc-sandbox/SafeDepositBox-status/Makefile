test:
	python setup.py py2app -A
	./dist/SafeDepositBox.app/Contents/MacOS/SafeDepositBox
build:
	python setup.py py2app
	cd dist && tar cvzf sdb.tar.bz2 SafeDepositBox.app
	mv dist/sdb.tar.bz2 ~/Dropbox

open:
	open dist/SafeDepositBox.app
clean:
	rm -rf *~ build dist


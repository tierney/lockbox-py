all : subdirs paper.ps 

DIA_FIGS = $(wildcard *.dia)
DIA_EPS = $(DIA_FIGS:.dia=.eps)

FIG_EPS = figs/$(wildcard *.eps)

TEX = ${wildcard *.tex}

TITLE=

DIRS=figs

subdirs :
	set -e; for d in $(DIRS); do $(MAKE) -C $$d ; done 
#cd figs && make

%.eps: %.dia
	sh -x dodia.sh $< $@

paper.pdf : subdirs paper.ps
	ps2pdf paper.ps

techreport.pdf : techreport.ps
	ps2pdf techreport.ps

%.ps : %.dvi
	dvips -Ppdf -Pcmz -Pamz -Pdownload35 -j0 -G0 -D 600 $< -t letter -o ${@}~
	sed -e 's/Title:\ .*/Title:\ ${TITLE}/' -e 's/Title\ \(.*\)/Title\ \(${TITLE}\)/' ${@}~ > $@
	rm ${@}~

paper.dvi : $(TEX) ref.bib $(DIA_EPS) $(FIG_EPS) 
	latex paper
	bibtex paper
	latex paper
	latex paper

techreport.dvi : $(TEX) ref.bib $(DIA_EPS) $(FIG_EPS) 
	latex techreport 
	bibtex techreport 
	latex techreport 
	latex techreport

sketch.dvi : sketch.tex
	latex sketch.tex

html : $(TEX_FILES) $(DIA_EPS)
	cat paper.tex | tth -r -Lpaper -e2 > name.html.tmp
#	for f in $(DIA_FIGS); do \
#		dia --nosplash -t png --size=800 $$f; \
#	done
	./make-html-links.pl < name.html.tmp > name.html
	rm name.html.tmp
	tar -czf name.tgz *.html *.png results/*.png

abstract-paper.dvi : abstract.tex abstract-paper.tex
	latex abstract-paper

abstract : abstract-paper.ps
	mv abstract-paper.ps abstract.ps

clean : 
	rm -rf *.dvi *.ps *.aux *.log *.bbl *.blg *~ 
	for d in $(DIRS); do (cd $$d; $(MAKE) clean ); done
